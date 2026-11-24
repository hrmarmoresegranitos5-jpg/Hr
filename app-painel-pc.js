// app-painel-pc.js — v1 (23/11/2026)
// PAINEL HR NO COMPUTADOR: em telas largas (≥ 1200 px) o menu vira uma barra lateral com nomes e aparece o
// "Painel" — central de comando com indicadores, gráficos, produção, agenda, equipe, conversas, cobranças,
// TV e uma caixa de comando que fala com o bot (o mesmo que escrever no WhatsApp).
(function () {
  'use strict';
  var LARGO = 1000, PG = 77;
  function balcao() { try { return localStorage.getItem('hr_balcao') === '1'; } catch (e) { return false; } }
  function largo() { return window.innerWidth >= LARGO && window.innerHeight >= 480 && window.innerWidth > window.innerHeight; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function R(v) { v = +v || 0; return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function Rk(v) { v = +v || 0; return Math.abs(v) >= 10000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : R(v); }
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function dBR(iso) { return iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : ''; }
  var BOT = null, botEm = 0, feed = [];

  // ── estilos ─────────────────────────────────────────────
  var css = document.createElement('style'); css.id = 'pcPainelCss';
  css.textContent = [
    '#pg77{overflow-y:auto;height:100%;}',
    '.pp{padding:22px 26px 40px;color:#efe9dc;font-family:Outfit,sans-serif;max-width:1800px;margin:0 auto;}',
    '.pp-top{display:flex;align-items:center;gap:18px;margin-bottom:18px;}',
    '.pp-tit{flex:none;}.pp-tit h1{font-family:"Cormorant Garamond",serif;font-size:1.9rem;color:#ecd27c;font-weight:700;line-height:1;margin:0;}.pp-tit small{display:block;font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:#a99c80;margin-top:6px;}',
    '.pp-cmd{flex:1;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.35);border-radius:14px;padding:6px 6px 6px 16px;}',
    '.pp-cmd input{flex:1;background:none;border:none;outline:none;color:#f3ecdb;font:500 .98rem Outfit,sans-serif;padding:8px 0;}',
    '.pp-cmd button{border:none;border-radius:10px;padding:10px 16px;font:700 .85rem Outfit,sans-serif;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;cursor:pointer;}',
    '.pp-rel{flex:none;text-align:right;font-size:.8rem;color:#a99c80;}.pp-rel b{display:block;font-size:1.5rem;color:#f3ecdb;font-weight:600;letter-spacing:.02em;}',
    '.pp-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:16px;}',
    '.pp-k{background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015));border:1px solid rgba(201,168,76,.22);border-radius:14px;padding:14px 16px;cursor:pointer;transition:border-color .15s,transform .15s;}',
    '.pp-k:hover{border-color:rgba(201,168,76,.6);transform:translateY(-1px);}',
    '.pp-k small{display:block;font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:#a99c80;}.pp-k b{display:block;font-size:1.45rem;font-weight:700;margin-top:6px;}.pp-k i{display:block;font-style:normal;font-size:.75rem;color:#a99c80;margin-top:3px;}',
    '.g{color:#5fd28e}.r{color:#ff8f7e}.o{color:#ecd27c}.b{color:#8fb4f5}',
    '.pp-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px;}',
    '.pp-c{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 16px;min-height:120px;display:flex;flex-direction:column;}',
    '.pp-c h3{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:#ecd27c;font-weight:600;margin:0 0 10px;}',
    '.pp-c h3 a{font-size:.7rem;letter-spacing:.05em;text-transform:none;color:#a99c80;cursor:pointer;font-weight:500;}.pp-c h3 a:hover{color:#ecd27c;}',
    '.s3{grid-column:span 3}.s4{grid-column:span 4}.s5{grid-column:span 5}.s6{grid-column:span 6}.s7{grid-column:span 7}.s8{grid-column:span 8}.s12{grid-column:span 12}',
    '.pp-l{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-size:.86rem;cursor:pointer;}.pp-l:last-child{border-bottom:none;}.pp-l:hover{background:rgba(255,255,255,.03);}',
    '.pp-l .n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.pp-l .n small{display:block;font-size:.72rem;color:#a99c80;overflow:hidden;text-overflow:ellipsis;}.pp-l .v{white-space:nowrap;font-weight:600;}',
    '.pp-vz{margin:auto;color:#8f846c;font-size:.82rem;text-align:center;padding:14px;}',
    '.pp-kb{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;flex:1;}.pp-col{background:rgba(0,0,0,.22);border-radius:12px;padding:8px;min-height:80px;}',
    '.pp-col h4{margin:0 0 6px;font-size:.72rem;color:#c8bb9c;font-weight:600;display:flex;justify-content:space-between;}.pp-col h4 b{color:#ecd27c;}',
    '.pp-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:7px 9px;margin-bottom:6px;font-size:.8rem;}.pp-card small{display:block;color:#a99c80;font-size:.7rem;margin-top:2px;}',
    '.pp-bar{height:6px;background:rgba(255,255,255,.08);border-radius:9px;overflow:hidden;margin-top:5px;}.pp-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#c9a84c,#ecd27c);}',
    '.pp-feed{flex:1;overflow-y:auto;max-height:260px;font-size:.84rem;line-height:1.45;}.pp-msg{margin-bottom:9px;padding:8px 10px;border-radius:10px;white-space:pre-wrap;}.pp-msg.eu{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);}.pp-msg.bot{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);}',
    '.pp-btns{display:flex;flex-wrap:wrap;gap:6px;}.pp-btns button{border:1px solid rgba(201,168,76,.4);background:rgba(255,255,255,.03);color:#f0d78c;border-radius:9px;padding:7px 10px;font:600 .78rem Outfit,sans-serif;cursor:pointer;}.pp-btns button:hover{background:rgba(201,168,76,.15);}',
    '.pp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}.pp-chips span{font-size:.75rem;padding:5px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.12);color:#d9cfb6;cursor:pointer;}.pp-chips span:hover{border-color:#c9a84c;color:#ecd27c;}',
    '.pp-alert{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;}.pp-alert div{font-size:.8rem;padding:8px 12px;border-radius:10px;background:rgba(255,120,90,.08);border:1px solid rgba(255,120,90,.3);color:#ffb7a8;cursor:pointer;}',
    '@media (max-width:1500px){.pp-kpis{grid-template-columns:repeat(3,1fr);}}',
    // barra lateral larga
    'body.pc-largo #nav .ni{flex-direction:row!important;justify-content:flex-start!important;gap:12px!important;padding:11px 18px!important;border-radius:10px;width:calc(100% - 16px)!important;margin:1px 8px;}',
    'body.pc-largo #nav .ni-i{font-size:1.1rem!important;}body.pc-largo #nav .ni-l{font-size:.86rem!important;max-width:none!important;font-weight:600!important;color:#d9cfb6;}',
    'body.pc-largo #nav .ni.on{background:rgba(201,168,76,.14);}body.pc-largo #nav .ni.on .ni-l{color:#ecd27c;}body.pc-largo #nav .ni:hover{background:rgba(255,255,255,.04);}',
    'body.pc-largo #nav .ni-sep{width:80%;height:1px;background:rgba(255,255,255,.08);margin:8px auto;}',
    'body.pc-largo #nav .pc-marca{padding:14px 18px 12px;font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#ecd27c;font-weight:700;width:100%;box-sizing:border-box;}body.pc-largo #nav .pc-marca small{display:block;font-family:Outfit;font-size:.6rem;letter-spacing:.3em;color:#a99c80;text-transform:uppercase;font-weight:500;margin-top:4px;}',
    'body.pc-painel #fabPlus{display:none!important;}',
    '#nav .pc-marca{display:none;}body.pc-largo #nav .pc-marca{display:block;}',
    '#nav .ni[data-pg="77"]{display:none;}body.pc-largo #nav .ni[data-pg="77"]{display:flex!important;}',
  ].join('\n');
  document.head.appendChild(css);

  // ── barra lateral larga ─────────────────────────────────
  var NAVW = 220;
  function ajustarLayout() {
    var on = largo() && document.getElementById('sApp') && document.getElementById('sApp').classList.contains('on');
    document.body.classList.toggle('pc-largo', !!on);
    if (!on) return;
    var nav = document.getElementById('nav'), hap = document.getElementById('hdrAndPages'), W = window.innerWidth, H = window.innerHeight;
    if (!nav || !hap) return;
    nav.style.width = NAVW + 'px'; nav.style.alignItems = 'stretch'; nav.style.justifyContent = 'flex-start'; nav.style.paddingTop = '0';
    hap.style.left = NAVW + 'px'; hap.style.width = (W - NAVW) + 'px';
  }
  var origSet = window.setLayout;
  function instalarSetLayout() {
    if (typeof window.setLayout !== 'function' || window.setLayout._pc) return;
    var o = window.setLayout; window.setLayout = function () { var r = o.apply(this, arguments); try { ajustarLayout(); } catch (e) {} return r; }; window.setLayout._pc = true;
  }
  function montarNav() {
    var nav = document.getElementById('nav'); if (!nav || nav.querySelector('[data-pg="77"]')) return;
    var mk = document.createElement('div'); mk.className = 'pc-marca'; mk.innerHTML = 'HR Mármores<small>Central de comando</small>';
    nav.insertBefore(mk, nav.firstChild);
    var ni = document.createElement('div'); ni.className = 'ni'; ni.setAttribute('data-pg', '77');
    ni.innerHTML = '<span class="ni-i">🧭</span><span class="ni-l">Painel</span>';
    ni.addEventListener('click', function () { abrir(); });
    mk.parentNode.insertBefore(ni, mk.nextSibling);
    var pages = document.getElementById('pages');
    if (pages && !document.getElementById('pg77')) { var pg = document.createElement('div'); pg.className = 'pg'; pg.id = 'pg77'; pages.appendChild(pg); }
  }
  function instalarGo() {
    if (typeof window.go !== 'function' || window.go._pc) return;
    var o = window.go; window.go = function (n) { var r = o.apply(this, arguments); if (+n === PG) { try { desenhar(); carregarBot(); } catch (e) { console.warn('[painel]', e); } } return r; }; window.go._pc = true;
  }
  function abrir() { if (typeof go === 'function') go(balcao() ? 0 : PG); } // no tablet do balcão abre no Orçamento
  window.abrirPainelPC = abrir;

  // ── dados do app ────────────────────────────────────────
  function dadosApp() {
    var hoje = hojeISO(), mes = hoje.slice(0, 7), t = (window.DB && DB.t) || [], q = (window.DB && DB.q) || [], j = (window.DB && DB.j) || [];
    var soma = function (f) { return t.filter(f).reduce(function (s, x) { return s + (+x.value || 0); }, 0); };
    var ent = soma(function (x) { return x.type === 'in' && String(x.date || '').slice(0, 7) === mes; });
    var sai = soma(function (x) { return x.type === 'out' && String(x.date || '').slice(0, 7) === mes; });
    var entHoje = soma(function (x) { return x.type === 'in' && x.date === hoje; });
    var pend = t.filter(function (x) { return x.type === 'pend'; }), aRec = pend.reduce(function (s, x) { return s + (+x.value || 0); }, 0);
    var st = function (x) { return x.status === 'aprovado' ? 'aceito' : (x.status || 'pendente'); };
    var qMes = q.filter(function (x) { return String(x.date || '').slice(0, 7) === mes; });
    var aceitosMes = qMes.filter(function (x) { return /aceito|concluido|conclu/.test(st(x)); });
    var abertos = q.filter(function (x) { return st(x) === 'pendente' && x.date && (new Date() - new Date(x.date + 'T12:00:00')) / 864e5 <= 45; });
    var meses = []; for (var i = 5; i >= 0; i--) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); var mk = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      meses.push({ m: mk, lbl: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), e: soma(function (x) { return x.type === 'in' && String(x.date || '').slice(0, 7) === mk; }), s: soma(function (x) { return x.type === 'out' && String(x.date || '').slice(0, 7) === mk; }) }); }
    var emProd = j.filter(function (x) { return !x.done; });
    var ag = []; var fim7 = addDias(hoje, 7);
    emProd.forEach(function (x) { if (x.end && x.end >= hoje && x.end <= fim7) ag.push({ d: x.end, t: 'Entrega', n: x.cli, s: x.desc || x.mat || '' }); if (x.start && x.start >= hoje && x.start <= fim7) ag.push({ d: x.start, t: 'Início', n: x.cli, s: x.desc || '' }); });
    try { (typeof _getV === 'function' ? _getV() : []).forEach(function (v) { if (v.status !== 'cancelada' && v.date >= hoje && v.date <= fim7) ag.push({ d: v.date, t: 'Visita' + (v.hora ? ' ' + v.hora : ''), n: v.cli || v.nome || '', s: v.end || v.bairro || '' }); }); } catch (e) {}
    ag.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var atras = emProd.filter(function (x) { return x.end && x.end < hoje && (x.stage || 'producao') !== 'entregue'; });
    var inad = j.filter(function (x) { return ((+x.value || 0) - (+x.pago || 0)) > 1 && (x.done || (x.end && x.end < hoje)); });
    return { ent: ent, sai: sai, entHoje: entHoje, aRec: aRec, pendVenc: pend.filter(function (x) { return x.date && x.date < hoje; }).length,
      qMes: qMes.length, aceitosMes: aceitosMes.length, valAceitos: aceitosMes.reduce(function (s, x) { return s + (+x.vista || 0); }, 0),
      abertos: abertos, valAbertos: abertos.reduce(function (s, x) { return s + (+x.vista || 0); }, 0), meses: meses, emProd: emProd, ag: ag, atras: atras, inad: inad };
  }

  // ── desenho ─────────────────────────────────────────────
  function grafico(meses) {
    var mx = Math.max(1, Math.max.apply(null, meses.map(function (m) { return Math.max(m.e, m.s); })));
    var W = 560, H = 170, bw = 30, gap = (W - 40) / meses.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + (H + 34) + '" style="width:100%;height:auto;">';
    for (var k = 0; k <= 3; k++) { var y = 10 + (H - 10) * k / 3; s += '<line x1="30" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/>'; }
    meses.forEach(function (m, i) { var x = 40 + i * gap, he = (H - 10) * m.e / mx, hs = (H - 10) * m.s / mx;
      s += '<rect x="' + x + '" y="' + (H - he) + '" width="' + bw + '" height="' + he + '" rx="4" fill="#5fd28e" opacity=".85"><title>Entrou ' + R(m.e) + '</title></rect>';
      s += '<rect x="' + (x + bw + 4) + '" y="' + (H - hs) + '" width="' + bw + '" height="' + hs + '" rx="4" fill="#ff8f7e" opacity=".75"><title>Saiu ' + R(m.s) + '</title></rect>';
      s += '<text x="' + (x + bw + 2) + '" y="' + (H + 18) + '" fill="#a99c80" font-size="12" text-anchor="middle" font-family="Outfit">' + esc(m.lbl) + '</text>';
      if (m.e) s += '<text x="' + (x + bw / 2) + '" y="' + (H - he - 5) + '" fill="#cfe9d8" font-size="10" text-anchor="middle" font-family="Outfit">' + esc(Rk(m.e).replace('R$ ', '')) + '</text>'; });
    return s + '</svg><div style="display:flex;gap:16px;font-size:.72rem;color:#a99c80;"><span><b class="g">■</b> Entrou</span><span><b class="r">■</b> Saiu</span></div>';
  }
  function lista(itens, vazio) { return itens.length ? itens.join('') : '<div class="pp-vz">' + vazio + '</div>'; }
  function desenhar() {
    var el = document.getElementById('pg77'); if (!el) return;
    var A = dadosApp(), B = BOT || {}, res = A.ent - A.sai, conv = A.qMes ? Math.round(A.aceitosMes / A.qMes * 100) : 0;
    var hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    var alertas = [];
    if (A.atras.length) alertas.push('<div data-ir="3">⏰ ' + A.atras.length + ' obra' + (A.atras.length > 1 ? 's' : '') + ' com prazo vencido</div>');
    if (A.pendVenc) alertas.push('<div data-ir="4">💸 ' + A.pendVenc + ' recebimento' + (A.pendVenc > 1 ? 's' : '') + ' vencido' + (A.pendVenc > 1 ? 's' : '') + '</div>');
    if ((B.conversas || []).length) alertas.push('<div data-crm="1">💬 ' + B.conversas.length + ' conversa' + (B.conversas.length > 1 ? 's' : '') + ' esperando resposta</div>');
    var devs = (B.devedores || []), totDev = devs.reduce(function (s, x) { return s + x.saldo; }, 0);
    var prod = B.producao || [], cols = { corte: [], acabamento: [], entrega: [] };
    prod.forEach(function (p) { (cols[p.etapa] || cols.corte).push(p); });
    var col = function (k, t) { var l = cols[k]; return '<div class="pp-col"><h4>' + t + '<b>' + l.length + '</b></h4>' + (l.length ? l.slice(0, 7).map(function (p) { return '<div class="pp-card">' + esc(p.nome) + '<small>' + esc([p.item, p.resp ? '👷 ' + p.resp : 'sem responsável', p.prazo ? 'até ' + dBR(p.prazo) : ''].filter(Boolean).join(' · ')) + '</small></div>'; }).join('') + (l.length > 7 ? '<small style="color:#a99c80">+' + (l.length - 7) + '</small>' : '') : '<div class="pp-vz" style="padding:6px">—</div>') + '</div>'; };
    var html = '<div class="pp">' +
      '<div class="pp-top"><div class="pp-tit"><h1>Central HR</h1><small>' + esc(dia) + '</small></div>' +
      '<div class="pp-cmd"><span style="color:#c9a84c">⌘</span><input id="ppCmd" placeholder="Fale com o bot: fechamento da semana · cobra a Renata · coloca cozinhas na TV · quem está devendo…" autocomplete="off"><button id="ppEnv">Enviar</button></div>' +
      '<div class="pp-rel"><b id="ppHora">' + hora + '</b>' + (B.em ? 'atualizado ' + new Date(B.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'carregando o bot…') + '</div></div>' +
      '<div class="pp-chips">' + ['Fechamento da semana', 'Quem está devendo', 'A liberar', 'Tarefas da equipe', 'Modelos', 'Coloca cozinhas na TV', 'Tira da TV'].map(function (c) { return '<span data-cmd="' + esc(c) + '">' + esc(c) + '</span>'; }).join('') + '</div>' +
      (alertas.length ? '<div class="pp-alert">' + alertas.join('') + '</div>' : '') +
      '<div class="pp-kpis">' +
        '<div class="pp-k" data-ir="4"><small>Entrou no mês</small><b class="g">' + Rk(A.ent) + '</b><i>hoje ' + R(A.entHoje) + '</i></div>' +
        '<div class="pp-k" data-ir="4"><small>Saiu no mês</small><b class="r">' + Rk(A.sai) + '</b><i>resultado <span class="' + (res >= 0 ? 'g' : 'r') + '">' + Rk(res) + '</span></i></div>' +
        '<div class="pp-k" data-ir="4"><small>A receber</small><b class="b">' + Rk(A.aRec) + '</b><i>' + (devs.length ? devs.length + ' devedores no bot · ' + Rk(totDev) : 'parcelas e saldos') + '</i></div>' +
        '<div class="pp-k" data-ir="4"><small>Caixa · Mercado Pago</small><b class="o">' + (B.saldo ? Rk(B.saldo.valor) : '—') + '</b><i>' + (B.mp ? 'a liberar ' + Rk(B.mp.liberar) + ' · 7 dias ' + Rk(B.mp.liberar7) : B.saldo ? 'extrato de ' + dBR(B.saldo.data) : 'sem extrato ainda') + '</i></div>' +
        '<div class="pp-k" data-ir="7"><small>Orçamentos abertos</small><b>' + A.abertos.length + '</b><i>' + Rk(A.valAbertos) + ' esperando resposta</i></div>' +
        '<div class="pp-k" data-ir="7"><small>Fechados no mês</small><b class="g">' + A.aceitosMes + ' <span style="font-size:.8rem;color:#a99c80">de ' + A.qMes + '</span></b><i>conversão ' + conv + '% · ' + Rk(A.valAceitos) + '</i></div>' +
      '</div>' +
      '<div class="pp-grid">' +
        '<div class="pp-c s5"><h3>Entradas × saídas · 6 meses<a data-ir="4">Finanças →</a></h3>' + grafico(A.meses) + '</div>' +
        '<div class="pp-c s7"><h3>Produção agora<a data-ir="3">Agenda →</a></h3>' + (prod.length ? '<div class="pp-kb">' + col('corte', '✂️ Corte') + col('acabamento', '🪨 Acabamento / fabricação') + col('entrega', '🚚 Entrega / instalação') + '</div>' : lista(A.emProd.slice(0, 8).map(function (x) { return '<div class="pp-l" data-ir="3"><div class="n">' + esc(x.cli) + '<small>' + esc(x.desc || x.mat || '') + '</small></div><div class="v">' + (x.end ? 'até ' + dBR(x.end) : '') + '</div></div>'; }), BOT ? 'Nada em produção agora.' : 'Carregando a produção do bot…')) + '</div>' +
        '<div class="pp-c s4"><h3>Próximos 7 dias<a data-ir="3">Agenda →</a></h3>' + lista(A.ag.slice(0, 9).map(function (x) { return '<div class="pp-l" data-ir="3"><div class="n">' + esc(x.n || '—') + '<small>' + esc(x.t + (x.s ? ' · ' + x.s : '')) + '</small></div><div class="v o">' + dBR(x.d) + '</div></div>'; }), 'Nada marcado para os próximos 7 dias.') + '</div>' +
        '<div class="pp-c s4"><h3>Equipe · pontos da semana<a data-ir="30">RH →</a></h3>' + lista((B.equipe || []).map(function (f) { var p = Math.min(100, +f.pct || 0); return '<div style="padding:6px 0;font-size:.84rem;"><div style="display:flex;justify-content:space-between"><span>' + esc(f.nome) + '</span><span><b class="' + (p >= 100 ? 'g' : p >= 60 ? 'o' : 'r') + '">' + String(f.pts).replace('.', ',') + '</b> <small style="color:#a99c80">de ' + String(f.meta).replace('.', ',') + ' · hoje ' + String(f.hoje).replace('.', ',') + '</small></span></div><div class="pp-bar"><i style="width:' + p + '%"></i></div></div>'; }), BOT ? 'Sem metas calculadas.' : 'Carregando…') + '</div>' +
        '<div class="pp-c s4"><h3>Conversas esperando<a data-crm="1">Abrir conversas →</a></h3>' + lista((B.conversas || []).slice(0, 7).map(function (c) { return '<div class="pp-l" data-crm="1"><div class="n">' + esc(c.nome || c.num) + '<small>' + esc(c.ultx || '') + '</small></div><div class="v" style="font-size:.72rem;color:#a99c80">' + new Date(c.ult).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</div></div>'; }), BOT ? 'Ninguém esperando resposta. 👌' : 'Carregando…') + '</div>' +
        '<div class="pp-c s4"><h3>Quem está devendo<a data-cmd="Quem está devendo">Detalhar →</a></h3>' + lista(devs.slice(0, 7).map(function (d) { return '<div class="pp-l" data-cmd="' + esc('Situação de ' + d.nome) + '"><div class="n">' + esc(d.nome) + '<small>' + (d.venc ? 'vence ' + dBR(d.venc) : '') + '</small></div><div class="v r">' + R(d.saldo) + '</div></div>'; }).concat(A.inad.slice(0, 4).map(function (x) { return '<div class="pp-l" data-ir="4"><div class="n">' + esc(x.cli) + '<small>saldo do serviço (app)</small></div><div class="v r">' + R((+x.value || 0) - (+x.pago || 0)) + '</div></div>'; })), 'Ninguém devendo. ✅') + '</div>' +
        '<div class="pp-c s4"><h3>Orçamentos esperando resposta<a data-ir="7">Histórico →</a></h3>' + lista(A.abertos.slice().sort(function (a, b) { return (+b.vista || 0) - (+a.vista || 0); }).slice(0, 7).map(function (x) { var d = Math.round((new Date() - new Date(x.date + 'T12:00:00')) / 864e5); return '<div class="pp-l" data-ir="7"><div class="n">' + esc(x.cli || 'cliente') + '<small>' + esc((x.tipo || '') + (x.mat ? ' · ' + x.mat : '') + ' · há ' + d + ' dia' + (d === 1 ? '' : 's')) + '</small></div><div class="v o">' + R(x.vista) + '</div></div>'; }), 'Nenhum orçamento esperando.') + '</div>' +
        '<div class="pp-c s4"><h3>Tela do cliente (TV)<a data-tv="link">Abrir na TV →</a></h3><div style="font-size:.82rem;color:#c8bb9c;margin-bottom:10px;">' + (B.tela && B.tela.pix ? '💠 Pix de ' + R(B.tela.pix) + ' na tela, esperando o pagamento.' : B.tela && B.tela.gal ? '🖼️ Mostrando: <b>' + esc(B.tela.gal) + '</b>' : 'Mostrando o orçamento (ou a tela de espera).') + '</div>' +
          '<div class="pp-btns">' + ['Cozinhas', 'Gourmet', 'Banheiros', 'Lavanderia', 'Túmulos', 'Nichos', 'Mesas', 'Pedras'].map(function (t) { return '<button data-cmd="coloca ' + (t === 'Pedras' ? 'pedras' : 'modelos de ' + t.toLowerCase()) + ' na TV">' + t + '</button>'; }).join('') + '<button data-cmd="tira da TV">✕ Voltar ao orçamento</button></div></div>' +
        (window.HR_IMP ? HR_IMP.cardHtml() : '') +
        '<div class="pp-c s12" id="ppFeedC"><h3>Bot · respostas</h3><div class="pp-feed" id="ppFeed">' + (feed.length ? feed.map(function (m) { return '<div class="pp-msg ' + m.q + '">' + esc(m.t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>') + '</div>'; }).join('') : '<div class="pp-vz">Escreva um comando na barra de cima. A resposta do bot aparece aqui — é o mesmo que mandar no WhatsApp.</div>') + '</div></div>' +
      '</div></div>';
    el.innerHTML = html;
    ligar(el);
    var fd = document.getElementById('ppFeed'); if (fd) fd.scrollTop = fd.scrollHeight;
  }
  function ligar(el) {
    var inp = document.getElementById('ppCmd'), bt = document.getElementById('ppEnv');
    if (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter') comando(inp.value); }; }
    if (bt) bt.onclick = function () { comando(inp.value); };
    el.onclick = function (e) {
      var a = e.target.closest('[data-ir],[data-cmd],[data-crm],[data-tv],[data-imp]'); if (!a || !el.contains(a)) return;
      if (a.hasAttribute('data-imp')) { if (window.HR_IMP) HR_IMP.clique(a); return; }
      if (a.hasAttribute('data-cmd')) { comando(a.getAttribute('data-cmd')); return; }
      if (a.hasAttribute('data-crm')) { if (typeof abrirCRM === 'function') abrirCRM(); return; }
      if (a.hasAttribute('data-tv')) { telaLink(); return; }
      if (a.hasAttribute('data-ir') && typeof go === 'function') go(+a.getAttribute('data-ir'));
    };
  }
  function telaLink() {
    var b = base(); if (!b) { toast('Configure o bot neste computador (Config → Bot).'); return; }
    fetch(b + '/bot/tela/link', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { if (j.url) window.open(j.url, 'hr_tela'); }).catch(function () { toast('Não consegui falar com o bot.'); });
  }
  function comando(txt) {
    txt = String(txt || '').trim(); if (!txt) return;
    var b = base(); if (!b) { toast('Configure o bot neste computador (Config → Bot).'); return; }
    feed.push({ q: 'eu', t: txt }, { q: 'bot', t: '…' }); desenhar();
    var inp = document.getElementById('ppCmd'); if (inp) inp.value = '';
    fetch(b + '/bot/painel/comando', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ texto: txt }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        feed.pop(); var rs = (j && j.respostas) || []; if (j && j.error) rs = ['⚠️ ' + j.error]; if (!rs.length) rs = ['Feito.'];
        rs.forEach(function (t) { feed.push({ q: 'bot', t: t }); }); feed = feed.slice(-30); desenhar(); carregarBot(true);
        setTimeout(function () { var c = document.getElementById('ppFeedC'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
      }).catch(function () { feed.pop(); feed.push({ q: 'bot', t: '⚠️ Não consegui falar com o bot agora.' }); desenhar(); });
  }
  function carregarBot(novo) {
    var b = base(); if (!b) return;
    if (!novo && BOT && Date.now() - botEm < 60000) return;
    botEm = Date.now();
    fetch(b + '/bot/painel' + (novo ? '?novo=1' : ''), { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { if (j && !j.error) { BOT = j; if (visivel()) desenhar(); } }).catch(function () {});
  }
  function visivel() { var el = document.getElementById('pg77'); return !!(el && el.style.display !== 'none' && el.offsetParent !== null); }

  // atalhos de teclado
  document.addEventListener('keydown', function (e) {
    if (!largo()) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); abrir(); setTimeout(function () { var i = document.getElementById('ppCmd'); if (i) i.focus(); }, 120); }
    if (e.altKey && /^[1-9]$/.test(e.key)) { var m = { 1: 77, 2: 0, 3: 3, 4: 4, 5: 7, 6: 10, 7: 30, 8: 11, 9: 13 }[e.key]; if (m != null && typeof go === 'function') { e.preventDefault(); go(m); } }
  });

  // inicialização
  var abriuPainel = false;
  function tick() {
    instalarSetLayout(); instalarGo(); montarNav(); ajustarLayout();
    var sp = document.getElementById('sSplash');
    if (largo() && !abriuPainel && sp && (sp.classList.contains('on') || getComputedStyle(sp).display !== 'none') && !(document.getElementById('sApp') || {}).classList.contains('on') && typeof openApp === 'function' && !document.querySelector('.ov.on')) { abriuPainel = true; try { openApp(balcao() ? 0 : PG); } catch (e) {} return; } // no computador abre direto na Central (no balcão: Orçamento)
    if (largo() && !abriuPainel && document.getElementById('sApp') && document.getElementById('sApp').classList.contains('on')) { abriuPainel = true; try { var on = document.querySelector('#nav .ni.on'); if (!on || on.getAttribute('data-pg') === '12') abrir(); } catch (e) {} }
    document.body.classList.toggle('pc-painel', visivel());
    if (visivel()) { var h = document.getElementById('ppHora'); if (h) h.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); carregarBot(); }
  }
  setInterval(tick, 1000);
  window.addEventListener('resize', function () { setTimeout(ajustarLayout, 50); });
  setInterval(function () { if (visivel() && !document.activeElement.closest('#pg77 .pp-cmd')) desenhar(); }, 60000);
})();
