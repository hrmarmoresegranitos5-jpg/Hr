// ══════════════════════════════════════════════════════════════
// app-cliente-perfil.js — v1.0
// Histórico Inteligente de Cliente
// • Perfil unificado: orçamentos + jobs + transações + visitas
// • Timeline cronológica de todos os contatos
// • Resumo financeiro e indicadores de recência/frequência
// • Observações persistentes por cliente
// • Abre ao tocar no nome do cliente em qualquer tela
// • Injeta modais faltantes (cliGestaoMd, cliFormMd, jobDetailMd,
//   cliACDrop) que são referenciados em app-clientes.js mas
//   ausentes do index.html
// ══════════════════════════════════════════════════════════════

(function() {
'use strict';

// ─── Aguardar DOM pronto ────────────────────────────────────
function _onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

// ─── Injetar modais que o app-clientes.js espera mas que não
//     existem no index.html ────────────────────────────────
function _injetarModaisFaltantes() {
  var fragmentos = [
    // jobDetailMd
    { id: 'jobDetailMd', html:
      '<div class="ov" id="jobDetailMd">' +
        '<div class="modal" style="padding:0;overflow:hidden;max-height:90vh;display:flex;flex-direction:column;">' +
          '<div id="jdHdr" style="padding:16px 18px 12px;border-bottom:1px solid var(--bd);flex-shrink:0;"></div>' +
          '<div style="display:flex;gap:0;border-bottom:1px solid var(--bd);flex-shrink:0;">' +
            '<button class="jd-tab on" data-dtab="financeiro" onclick="detailTab(\'financeiro\')" style="flex:1;padding:10px 4px;background:none;border:none;font-family:Outfit;font-size:.7rem;font-weight:700;color:var(--t2);cursor:pointer;">💰 Financeiro</button>' +
            '<button class="jd-tab" data-dtab="parcelas" onclick="detailTab(\'parcelas\')" style="flex:1;padding:10px 4px;background:none;border:none;font-family:Outfit;font-size:.7rem;font-weight:700;color:var(--t2);cursor:pointer;">📋 Parcelas</button>' +
            '<button class="jd-tab" data-dtab="status" onclick="detailTab(\'status\')" style="flex:1;padding:10px 4px;background:none;border:none;font-family:Outfit;font-size:.7rem;font-weight:700;color:var(--t2);cursor:pointer;">⚙️ Status</button>' +
            '<button class="jd-tab" data-dtab="obs" onclick="detailTab(\'obs\')" style="flex:1;padding:10px 4px;background:none;border:none;font-family:Outfit;font-size:.7rem;font-weight:700;color:var(--t2);cursor:pointer;">📝 Obs</button>' +
          '</div>' +
          '<div id="jdBody" style="overflow-y:auto;padding:14px 16px;flex:1;"></div>' +
          '<div style="padding:10px 16px;border-top:1px solid var(--bd);flex-shrink:0;">' +
            '<button class="btn btn-o" data-close style="width:100%;">Fechar</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    },
    // cliGestaoMd
    { id: 'cliGestaoMd', html:
      '<div class="ov" id="cliGestaoMd">' +
        '<div class="modal" style="padding:0;overflow:hidden;max-height:90vh;display:flex;flex-direction:column;">' +
          '<div style="padding:16px 18px 12px;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
            '<div style="font-size:1rem;font-weight:700;color:var(--gold2);">👥 Banco de Clientes</div>' +
            '<button onclick="cliAbrirNovo()" style="padding:7px 12px;background:var(--gold2);color:#000;border:none;border-radius:9px;font-family:Outfit;font-size:.72rem;font-weight:700;cursor:pointer;">+ Novo</button>' +
          '</div>' +
          '<div style="padding:10px 14px;border-bottom:1px solid var(--bd);flex-shrink:0;">' +
            '<input id="cliBuscaInp" placeholder="Buscar cliente..." type="text" oninput="renderListaClientes(this.value)" ' +
              'style="width:100%;padding:9px 12px;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;color:var(--tx);font-family:Outfit;font-size:.84rem;box-sizing:border-box;outline:none;">' +
          '</div>' +
          '<div id="cliLista" style="overflow-y:auto;flex:1;"></div>' +
          '<div style="padding:10px 14px;border-top:1px solid var(--bd);flex-shrink:0;">' +
            '<button class="btn btn-o" data-close style="width:100%;">Fechar</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    },
    // cliFormMd
    { id: 'cliFormMd', html:
      '<div class="ov" id="cliFormMd" style="align-items:flex-end;"></div>'
    },
    // cliACDrop — dropdown de autocomplete sob o campo oCliente
    { id: 'cliACDrop', html:
      '<div id="cliACDrop" style="display:none;position:fixed;left:0;right:0;background:var(--s1);border:1px solid var(--bd);border-radius:0 0 14px 14px;z-index:999;box-shadow:0 8px 24px rgba(0,0,0,.4);max-height:260px;overflow-y:auto;"></div>'
    }
  ];

  fragmentos.forEach(function(f) {
    if (!document.getElementById(f.id)) {
      var tmp = document.createElement('div');
      tmp.innerHTML = f.html;
      document.body.appendChild(tmp.firstChild);
    }
  });
}

// ─── Posicionar cliACDrop sob o input ────────────────────────
function _posicionarACDrop() {
  var inp = document.getElementById('oCliente');
  var dd  = document.getElementById('cliACDrop');
  if (!inp || !dd) return;
  var r = inp.getBoundingClientRect();
  dd.style.top    = (r.bottom) + 'px';
  dd.style.left   = r.left + 'px';
  dd.style.width  = r.width + 'px';
  dd.style.right  = 'auto';
}

window.addEventListener('scroll', _posicionarACDrop, true);
window.addEventListener('resize', _posicionarACDrop);

// ─── CSS do módulo ───────────────────────────────────────────
function _injetarCSS() {
  if (document.getElementById('cpStyle')) return;
  var s = document.createElement('style');
  s.id = 'cpStyle';
  s.textContent = `
    /* ── Perfil overlay ── */
    #cliPerfilOv {
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(0,0,0,.6);
      display: flex; align-items: flex-end;
      opacity: 0; pointer-events: none;
      transition: opacity .25s;
    }
    #cliPerfilOv.on { opacity: 1; pointer-events: all; }

    #cliPerfilPanel {
      width: 100%; max-width: 480px; margin: 0 auto;
      max-height: 92vh; overflow-y: auto;
      background: var(--s1, #161618);
      border-radius: 22px 22px 0 0;
      border-top: 1px solid rgba(201,168,76,.2);
      transform: translateY(100%);
      transition: transform .3s cubic-bezier(.32,.72,0,1);
      -webkit-overflow-scrolling: touch;
    }
    #cliPerfilOv.on #cliPerfilPanel { transform: translateY(0); }

    .cp-drag-bar {
      width: 36px; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,.15);
      margin: 10px auto 4px;
    }

    /* Header do perfil */
    .cp-hdr {
      padding: 14px 18px 16px;
      border-bottom: 1px solid var(--bd, #2a2a2e);
    }
    .cp-hdr-row { display: flex; align-items: center; gap: 13px; }
    .cp-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; font-weight: 900; flex-shrink: 0;
    }
    .cp-hdr-info { flex: 1; min-width: 0; }
    .cp-nome {
      font-size: 1rem; font-weight: 800; color: var(--tx);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cp-sub { font-size: .68rem; color: var(--t3); margin-top: 2px; }
    .cp-badge {
      display: inline-block; padding: 3px 9px;
      border-radius: 20px; font-size: .62rem; font-weight: 700;
      border: 1px solid currentColor; margin-top: 5px;
    }

    /* Cards de resumo */
    .cp-resumo {
      display: grid; grid-template-columns: repeat(3,1fr);
      gap: 8px; padding: 14px 14px 0;
    }
    .cp-res-card {
      background: var(--s2, #1e1e22);
      border-radius: 12px; padding: 10px 10px 9px;
      text-align: center;
    }
    .cp-res-v {
      font-size: 1.1rem; font-weight: 800; color: var(--gold2, #d4ac50);
      line-height: 1.1;
    }
    .cp-res-v.grn { color: #5dbf7a; }
    .cp-res-v.red { color: #c94444; }
    .cp-res-l { font-size: .58rem; color: var(--t3); margin-top: 3px; font-weight: 600; letter-spacing: .3px; }

    /* Alerta de recência */
    .cp-alerta {
      margin: 12px 14px 0;
      padding: 9px 13px; border-radius: 11px;
      font-size: .72rem; font-weight: 600;
      display: flex; align-items: center; gap: 9px;
    }
    .cp-alerta-warn { background: rgba(212,160,23,.1); color: #d4a017; border: 1px solid rgba(212,160,23,.25); }
    .cp-alerta-ok   { background: rgba(93,191,122,.08); color: #5dbf7a; border: 1px solid rgba(93,191,122,.2); }

    /* Seção obs persistentes */
    .cp-obs-sec { padding: 14px 14px 0; }
    .cp-obs-lbl {
      font-size: .6rem; font-weight: 700; letter-spacing: .8px;
      color: rgba(201,168,76,.5); margin-bottom: 6px;
    }
    .cp-obs-area {
      width: 100%; box-sizing: border-box;
      background: var(--s2); border: 1px solid var(--bd2);
      border-radius: 10px; padding: 10px 12px;
      color: var(--tx); font-family: Outfit, sans-serif;
      font-size: .8rem; resize: none; outline: none;
      transition: border-color .2s;
    }
    .cp-obs-area:focus { border-color: rgba(201,168,76,.4); }
    .cp-obs-btn {
      margin-top: 7px; width: 100%; padding: 9px;
      background: var(--s3); border: 1px solid var(--bd2);
      border-radius: 9px; color: var(--t2);
      font-family: Outfit; font-size: .78rem;
      font-weight: 600; cursor: pointer; transition: background .15s;
    }
    .cp-obs-btn:active { background: rgba(201,168,76,.15); }

    /* Timeline */
    .cp-tl-sec { padding: 14px 14px 0; }
    .cp-tl-title {
      font-size: .6rem; font-weight: 700; letter-spacing: .8px;
      color: rgba(201,168,76,.5); margin-bottom: 10px;
    }
    .cp-tl-item {
      display: flex; gap: 11px; margin-bottom: 10px;
      position: relative;
    }
    .cp-tl-item:not(:last-child)::before {
      content: ''; position: absolute;
      left: 14px; top: 28px; bottom: -10px;
      width: 1px; background: rgba(255,255,255,.07);
    }
    .cp-tl-dot {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: .85rem;
      background: var(--s2); border: 1px solid var(--bd);
    }
    .cp-tl-body { flex: 1; min-width: 0; padding-top: 4px; }
    .cp-tl-desc {
      font-size: .78rem; font-weight: 700; color: var(--tx);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cp-tl-meta { font-size: .62rem; color: var(--t3); margin-top: 1px; }
    .cp-tl-val {
      font-size: .72rem; font-weight: 700; color: var(--gold2);
      flex-shrink: 0; padding-top: 4px;
    }

    /* Botão de abrir perfil nos nomes */
    .cp-btn-perfil {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .62rem; color: rgba(201,168,76,.6);
      cursor: pointer; margin-left: 5px;
      border: none; background: none; font-family: Outfit;
      padding: 0; vertical-align: middle;
    }
    .cp-btn-perfil:active { color: var(--gold2); }

    /* jd-tab ativo */
    .jd-tab.on { color: var(--gold2) !important; border-bottom: 2px solid var(--gold2); }
    .jd-fin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .jd-fin-item { background: var(--s2); border-radius: 10px; padding: 10px 11px; }
    .jd-fin-lbl  { font-size: .6rem; color: var(--t3); margin-bottom: 3px; font-weight: 600; }
    .jd-fin-val  { font-size: .9rem; font-weight: 800; color: var(--tx); }
    .jd-fin-val.gold { color: var(--gold2); }
    .jd-fin-val.grn  { color: #5dbf7a; }
    .jd-fin-val.red  { color: #c94444; }
    .jd-receber-btn { width: 100%; margin-bottom: 8px; }
    .jd-pago-ok { text-align: center; color: #5dbf7a; font-size: .8rem; font-weight: 700; padding: 10px; }
    .jd-parc-list {}
    .jd-parc-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--bd); }
    .jd-parc-atras { background: rgba(201,68,68,.05); border-radius: 8px; padding: 8px 10px; margin: 2px 0; }
    .jd-parc-desc { font-size: .76rem; color: var(--tx); font-weight: 600; flex: 1; }
    .jd-parc-info { display: flex; align-items: center; gap: 7px; }
    .jd-parc-dt   { font-size: .62rem; color: var(--t3); }
    .jd-parc-val  { font-size: .76rem; font-weight: 700; }
    .jd-parc-val.grn { color: #5dbf7a; }
    .jd-parc-val.yel { color: #d4a017; }
    .jd-parc-val.red { color: #c94444; }
    .fin-tag-atras { font-size: .55rem; padding: 2px 6px; background: rgba(201,68,68,.15); color: #c94444; border-radius: 5px; font-weight: 700; }
    .jd-rec-btn { padding: 5px 10px; background: rgba(93,191,122,.1); color: #5dbf7a; border: 1px solid rgba(93,191,122,.25); border-radius: 7px; font-family: Outfit; font-size: .7rem; cursor: pointer; }
    .jd-status-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .jd-st-opt { background: var(--s2); border: 1px solid var(--bd); border-radius: 12px; padding: 13px 10px; text-align: center; cursor: pointer; transition: all .15s; }
    .jd-st-opt.on { background: rgba(201,168,76,.1); border-color: var(--gold); }
    .jd-st-em { font-size: 1.4rem; display: block; }
    .jd-st-lbl { font-size: .68rem; font-weight: 700; color: var(--t2); display: block; margin-top: 4px; }
    .jd-obs-area { width: 100%; box-sizing: border-box; background: var(--s2); border: 1px solid var(--bd2); border-radius: 10px; padding: 10px 12px; color: var(--tx); font-family: Outfit; font-size: .82rem; resize: none; outline: none; }
    .jd-placeholder { text-align: center; color: var(--t3); padding: 24px; font-size: .78rem; }

    /* Editar perfil - botões */
    .cp-footer {
      padding: 14px 14px 32px;
      display: flex; gap: 8px;
    }
    .cp-footer button { flex: 1; }
  `;
  document.head.appendChild(s);
}

// ─── Montar dados do perfil de um cliente ───────────────────
function _montarPerfil(nome) {
  if (typeof _cliHist !== 'function') return null;

  var hist = _cliHist(nome);
  var orcs  = (DB.q || []).filter(function(q) { return _cliSim && _cliSim(nome, q.cli) >= 70; });
  var jobs  = (DB.j || []).filter(function(j) { return _cliSim && _cliSim(nome, j.cli) >= 70; });
  var trans = (DB.t || []).filter(function(t) {
    return t.type === 'in' && t.desc && typeof _cliNorm === 'function' &&
           _cliNorm(t.desc).indexOf(_cliNorm(nome)) !== -1;
  });
  var visitas = [];
  try {
    var vAll = JSON.parse(localStorage.getItem('hr_v') || '[]');
    visitas = vAll.filter(function(v) {
      return _cliSim && _cliSim(nome, v.cli) >= 70;
    });
  } catch(e) {}

  // Obs persistente do CLDB
  var cli = null;
  if (typeof CLDB !== 'undefined') {
    var todos = CLDB.get();
    var match = (typeof _cliBuscar === 'function') ? _cliBuscar(nome, 70) : [];
    if (match.length) cli = match[0].c;
  }

  // Calcular recência (dias desde último contato)
  var datas = [];
  orcs.forEach(function(q)  { if (q.date) datas.push(q.date); });
  jobs.forEach(function(j)  { if (j.start) datas.push(j.start); if (j.end) datas.push(j.end); });
  visitas.forEach(function(v){ if (v.date) datas.push(v.date); });
  datas.sort();
  var ultimoContato = datas.length ? datas[datas.length - 1] : null;
  var diasSemContato = ultimoContato ? Math.floor((new Date() - new Date(ultimoContato + 'T00:00:00')) / 86400000) : null;

  // Calcular saldo em aberto
  var totalJobs = jobs.reduce(function(s, j) { return s + (j.value || 0); }, 0);
  var totalPago = jobs.reduce(function(s, j) { return s + (j.pago || 0); }, 0);
  var emAberto  = totalJobs - totalPago;

  // Timeline unificada
  var timeline = [];
  orcs.forEach(function(q) {
    timeline.push({ tipo: 'orc', data: q.date || '', emoji: '💰', desc: 'Orçamento — ' + (q.tipo || '') + ' ' + (q.mat || ''), val: q.vista || 0, id: q.id });
  });
  jobs.forEach(function(j) {
    timeline.push({ tipo: 'job', data: j.start || '', emoji: '🔨', desc: 'Serviço — ' + (j.desc || ''), val: j.value || 0, id: j.id });
    if (j.done && j.end) {
      timeline.push({ tipo: 'fin', data: j.end, emoji: '✅', desc: 'Serviço concluído', val: 0, id: j.id });
    }
  });
  trans.forEach(function(t) {
    timeline.push({ tipo: 'pag', data: t.date || '', emoji: '💵', desc: t.desc || 'Pagamento', val: t.value || 0, id: t.id });
  });
  visitas.forEach(function(v) {
    var statusIco = v.status === 'realizada' ? '✔️' : '📐';
    timeline.push({ tipo: 'vis', data: v.date || '', emoji: statusIco, desc: 'Visita de medição — ' + (v.status || ''), val: 0, id: v.id });
  });
  timeline.sort(function(a, b) { return a.data > b.data ? -1 : 1; }); // mais recente primeiro

  return { hist, orcs, jobs, trans, visitas, cli, ultimoContato, diasSemContato, totalJobs, totalPago, emAberto, timeline };
}

// ─── Renderizar o painel de perfil ──────────────────────────
var _cpNomeAtual = '';

function _renderizarPerfil(nome) {
  _cpNomeAtual = nome;
  var p = _montarPerfil(nome);
  if (!p) return;
  var h = p.hist;

  var panel = document.getElementById('cliPerfilPanel');
  if (!panel) return;

  // ── Header ─────────────────────────────────────────────
  var hdrHtml =
    '<div class="cp-drag-bar"></div>' +
    '<div class="cp-hdr">' +
      '<div class="cp-hdr-row">' +
        '<div class="cp-avatar" style="background:' + h.cor + '22;color:' + h.cor + ';">' +
          (nome ? nome[0].toUpperCase() : '?') +
        '</div>' +
        '<div class="cp-hdr-info">' +
          '<div class="cp-nome">' + escH(nome) + '</div>' +
          (p.cli && p.cli.tel ? '<div class="cp-sub">📱 ' + escH(p.cli.tel) + (p.cli.cidade ? ' · 📍 ' + escH(p.cli.cidade) : '') + '</div>' : '') +
          '<div class="cp-badge" style="color:' + h.cor + ';border-color:' + h.cor + '44;">' +
            h.icon + ' ' + h.cat +
          '</div>' +
        '</div>' +
        '<button onclick="CP.fechar()" style="padding:8px 12px;background:var(--s3);border:none;border-radius:9px;color:var(--t2);font-family:Outfit;font-size:.72rem;cursor:pointer;">✕</button>' +
      '</div>' +
    '</div>';

  // ── Resumo financeiro ───────────────────────────────────
  var resumoHtml =
    '<div class="cp-resumo">' +
      '<div class="cp-res-card">' +
        '<div class="cp-res-v">' + (h.fat > 0 ? 'R$' + (h.fat >= 1000 ? (h.fat/1000).toFixed(0) + 'k' : fm(h.fat)) : '—') + '</div>' +
        '<div class="cp-res-l">FATURADO</div>' +
      '</div>' +
      '<div class="cp-res-card">' +
        '<div class="cp-res-v ' + (p.emAberto > 0 ? 'red' : 'grn') + '">' +
          (p.emAberto > 0 ? 'R$' + (p.emAberto >= 1000 ? (p.emAberto/1000).toFixed(1) + 'k' : fm(p.emAberto)) : '✓') +
        '</div>' +
        '<div class="cp-res-l">EM ABERTO</div>' +
      '</div>' +
      '<div class="cp-res-card">' +
        '<div class="cp-res-v">' + h.orcs + ' / <span style="color:#5dbf7a;">' + h.jobs + '</span></div>' +
        '<div class="cp-res-l">ORC / SERV</div>' +
      '</div>' +
    '</div>';

  // ── Alerta de recência ──────────────────────────────────
  var alertaHtml = '';
  if (p.diasSemContato !== null) {
    if (p.diasSemContato > 90) {
      alertaHtml =
        '<div class="cp-alerta cp-alerta-warn">' +
          '<span>⚠️</span>' +
          '<span>Sem contato há <strong>' + p.diasSemContato + ' dias</strong> — considere um follow-up</span>' +
        '</div>';
    } else if (p.diasSemContato <= 30) {
      alertaHtml =
        '<div class="cp-alerta cp-alerta-ok">' +
          '<span>✅</span>' +
          '<span>Contato recente — ' + (p.diasSemContato === 0 ? 'hoje' : 'há ' + p.diasSemContato + ' dias') + '</span>' +
        '</div>';
    }
  }

  // ── Obs persistentes ───────────────────────────────────
  var obsAtual = (p.cli && p.cli.obs) || '';
  var obsHtml =
    '<div class="cp-obs-sec">' +
      '<div class="cp-obs-lbl">📝 OBSERVAÇÕES PERMANENTES</div>' +
      '<textarea class="cp-obs-area" id="cpObsTxt" rows="3" ' +
        'placeholder="Preferências de pedra, estilo, endereço, família...">' +
        escH(obsAtual) +
      '</textarea>' +
      '<button class="cp-obs-btn" onclick="CP.salvarObs()">💾 Salvar observações</button>' +
    '</div>';

  // ── Timeline ───────────────────────────────────────────
  var tlHtml = '<div class="cp-tl-sec"><div class="cp-tl-title">🕐 LINHA DO TEMPO</div>';
  if (!p.timeline.length) {
    tlHtml += '<div style="color:var(--t3);font-size:.75rem;text-align:center;padding:16px;">Nenhum registro encontrado.</div>';
  } else {
    p.timeline.slice(0, 20).forEach(function(ev) {
      tlHtml +=
        '<div class="cp-tl-item">' +
          '<div class="cp-tl-dot">' + ev.emoji + '</div>' +
          '<div class="cp-tl-body">' +
            '<div class="cp-tl-desc">' + escH(ev.desc) + '</div>' +
            '<div class="cp-tl-meta">' + (ev.data ? fd(ev.data) : 'Sem data') + '</div>' +
          '</div>' +
          (ev.val > 0 ? '<div class="cp-tl-val">R$ ' + fm(ev.val) + '</div>' : '') +
        '</div>';
    });
    if (p.timeline.length > 20) {
      tlHtml += '<div style="text-align:center;font-size:.68rem;color:var(--t3);padding:8px;">+ ' + (p.timeline.length - 20) + ' eventos anteriores</div>';
    }
  }
  tlHtml += '</div>';

  // ── Footer ─────────────────────────────────────────────
  var footerHtml =
    '<div class="cp-footer">' +
      (p.cli
        ? '<button class="btn btn-o" onclick="cliAbrirEditar(' + p.cli.id + ');CP.fechar();">✏️ Editar</button>'
        : '<button class="btn btn-o" onclick="cliAbrirNovo();CP.fechar();">➕ Cadastrar</button>'
      ) +
      '<button class="btn btn-red" onclick="CP.fechar()">Fechar</button>' +
    '</div>';

  panel.innerHTML = hdrHtml + resumoHtml + alertaHtml + obsHtml + tlHtml + footerHtml;

  // Ajustar posição do textarea de obs após render
  var ta = document.getElementById('cpObsTxt');
  if (ta) ta.rows = 3;
}

// ─── API pública do módulo ──────────────────────────────────
window.CP = {
  abrir: function(nome) {
    if (!nome) return;
    var ov = document.getElementById('cliPerfilOv');
    if (!ov) return;
    _renderizarPerfil(nome);
    ov.classList.add('on');
  },
  fechar: function() {
    var ov = document.getElementById('cliPerfilOv');
    if (ov) ov.classList.remove('on');
  },
  salvarObs: function() {
    var ta = document.getElementById('cpObsTxt');
    if (!ta) return;
    var obs = ta.value.trim();
    if (typeof CLDB === 'undefined') return;
    if (typeof _cliBuscar === 'function') {
      var match = _cliBuscar(_cpNomeAtual, 70);
      if (match.length) {
        CLDB.upd(match[0].c.id, { obs: obs });
        if (typeof toast === 'function') toast('✓ Observações salvas!');
        return;
      }
    }
    // Cliente não cadastrado — cadastrar automaticamente
    CLDB.add({ nome: _cpNomeAtual, tel: '', cidade: '', end: '', obs: obs });
    if (typeof toast === 'function') toast('✓ Observações salvas!');
  }
};

// ─── Injetar overlay de perfil no DOM ──────────────────────
function _injetarPerfilOv() {
  if (document.getElementById('cliPerfilOv')) return;
  var ov = document.createElement('div');
  ov.id = 'cliPerfilOv';
  ov.innerHTML = '<div id="cliPerfilPanel"></div>';
  ov.addEventListener('click', function(e) {
    if (e.target === ov) CP.fechar();
  });
  document.body.appendChild(ov);
}

// ─── Interceptar cliques em nomes de clientes ───────────────
// Delega o evento ao document para capturar elementos renderizados
// dinamicamente. Busca o atributo data-cp-nome nos elementos.
function _initClickDelegation() {
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-cp-nome]');
    if (el) {
      e.stopPropagation();
      CP.abrir(el.dataset.cpNome);
    }
  });
}

// ─── Patch em renderOrc: adicionar botão 👤 nos nomes ────────
// Intercepta a função buildOrcList depois que ela carrega
function _patchOrcList() {
  var orig = window.buildOrcList;
  if (!orig || window._cpOrcPatchDone) return;
  window._cpOrcPatchDone = true;
  window.buildOrcList = function(list) {
    orig(list);
    // Adicionar botão de perfil nos qcard-cli
    document.querySelectorAll('.qcard-cli').forEach(function(el) {
      if (el.querySelector('.cp-btn-perfil')) return;
      var txt = el.textContent.trim().replace('💰', '').trim();
      if (!txt) return;
      var btn = document.createElement('button');
      btn.className = 'cp-btn-perfil';
      btn.setAttribute('data-cp-nome', txt);
      btn.innerHTML = '👤';
      btn.title = 'Ver perfil de ' + txt;
      el.appendChild(btn);
    });
  };
}

// ─── Patch em renderAg (agenda): botão 👤 nos jobs ──────────
function _patchAg() {
  var orig = window.renderAg;
  if (!orig || window._cpAgPatchDone) return;
  window._cpAgPatchDone = true;
  window.renderAg = function() {
    orig.apply(this, arguments);
    setTimeout(function() {
      document.querySelectorAll('.jc-cli').forEach(function(el) {
        if (el.querySelector('.cp-btn-perfil')) return;
        var txt = el.textContent.trim();
        if (!txt) return;
        var btn = document.createElement('button');
        btn.className = 'cp-btn-perfil';
        btn.setAttribute('data-cp-nome', txt);
        btn.innerHTML = '👤';
        btn.title = 'Ver perfil de ' + txt;
        el.appendChild(btn);
      });
    }, 50);
  };
}

// ─── Patch na secretaria: briefing ──────────────────────────
function _patchSec() {
  var orig = window.renderSecBriefing;
  if (!orig || window._cpSecPatchDone) return;
  window._cpSecPatchDone = true;
  window.renderSecBriefing = function() {
    orig.apply(this, arguments);
    setTimeout(function() {
      document.querySelectorAll('.sec2-job-cli, .sec2-vis-cli').forEach(function(el) {
        if (el.querySelector('.cp-btn-perfil')) return;
        var txt = el.textContent.trim();
        if (!txt) return;
        var btn = document.createElement('button');
        btn.className = 'cp-btn-perfil';
        btn.setAttribute('data-cp-nome', txt);
        btn.innerHTML = '👤';
        el.appendChild(btn);
      });
    }, 80);
  };
}

// ─── Aplicar patches periodicamente até funções carregarem ──
function _aplicarPatches() {
  _patchOrcList();
  _patchAg();
  _patchSec();
}

// ─── Inicialização ──────────────────────────────────────────
_onReady(function() {
  _injetarCSS();
  _injetarModaisFaltantes();
  _injetarPerfilOv();
  _initClickDelegation();

  // Posicionar AC drop quando input de cliente for focado
  var inp = document.getElementById('oCliente');
  if (inp) {
    inp.addEventListener('focus', _posicionarACDrop);
    inp.addEventListener('input', _posicionarACDrop);
  }

  // Tentar patches imediato + retry
  _aplicarPatches();
  setTimeout(_aplicarPatches, 600);
  setTimeout(_aplicarPatches, 2000);
  setTimeout(_aplicarPatches, 5000);
});

})();
