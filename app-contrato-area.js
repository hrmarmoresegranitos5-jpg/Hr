// ══════════════════════════════════════════════════════════════
// CONTRATOS — ÁREA DEDICADA
// Módulo de gestão e acompanhamento de contratos
// ══════════════════════════════════════════════════════════════

(function(){
  // Injeta CSS da área de contratos
  var css = `
/* ── Contratos: Hero ── */
.ctr-hero{padding:20px 17px 14px;background:linear-gradient(160deg,#080d08,#0d150d,#070709);border-bottom:1px solid rgba(58,158,106,.15);}
.ctr-hero .htitle{color:#4db87a;}
.ctr-hero .hsub2{color:rgba(77,184,122,.45);}

/* ── Stats ── */
.ctr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 14px 4px;}
.ctr-stat{background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:12px 8px 10px;text-align:center;}
.ctr-stat-icon{font-size:1.1rem;margin-bottom:4px;}
.ctr-stat-val{font-size:1rem;font-weight:700;color:var(--tx);line-height:1.1;}
.ctr-stat-lbl{font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-top:3px;}

/* ── Filter Tabs ── */
.ctr-tabs{display:flex;gap:6px;padding:10px 14px 4px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.ctr-tabs::-webkit-scrollbar{display:none;}
.ctr-tab{background:var(--s2);border:1px solid var(--bd2);border-radius:20px;padding:6px 13px;font-size:.68rem;font-weight:600;color:var(--t2);white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:all .15s;}
.ctr-tab.on{background:#0a1f12;border-color:#1a4030;color:#4db87a;}
.ctr-tab-cnt{background:var(--s4);border-radius:10px;padding:1px 7px;font-size:.6rem;}
.ctr-tab.on .ctr-tab-cnt{background:rgba(58,158,106,.2);color:#4db87a;}

/* ── Search ── */
.ctr-search-wrap{display:flex;align-items:center;gap:8px;margin:8px 14px 4px;background:var(--s2);border:1px solid var(--bd2);border-radius:11px;padding:9px 12px;}

/* ── Cards ── */
.ctr-list{padding:6px 14px 8px;}
.ctr-card{background:var(--s2);border:1px solid var(--bd);border-radius:13px;padding:13px 13px 11px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;cursor:pointer;transition:border-color .15s,background .15s;active:opacity:.85;}
.ctr-card:active{background:var(--s3);}
.ctr-card-left{flex:1;min-width:0;}
.ctr-card-cli{font-size:.88rem;font-weight:700;color:var(--tx);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ctr-card-meta{font-size:.68rem;color:var(--t3);margin-bottom:3px;}
.ctr-card-meta span+span{margin-left:4px;}
.ctr-card-dtg{font-size:.6rem;color:var(--t4);margin-top:2px;}
.ctr-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.ctr-card-val{font-size:.82rem;font-weight:700;color:var(--gold2);}
.ctr-card-actions{display:flex;gap:5px;align-items:center;}

/* ── Badges ── */
.ctr-badge{font-size:.56rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;border-radius:8px;white-space:nowrap;}
.ctr-badge-pendente{background:#1a120a;color:#c9a84c;border:1px solid rgba(201,168,76,.25);}
.ctr-badge-gerado{background:#0a1520;color:#60a0e0;border:1px solid rgba(96,160,224,.25);}
.ctr-badge-assinado{background:#0a1f12;color:#4db87a;border:1px solid rgba(77,184,122,.25);}

/* ── Botões pequenos ── */
.ctr-btn-sm{border:none;border-radius:8px;padding:6px 10px;font-size:.63rem;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;transition:opacity .15s;white-space:nowrap;}
.ctr-btn-sm:active{opacity:.75;}
.ctr-btn-pri{background:linear-gradient(135deg,#0a1520,#0d2035);color:#60a0e0;border:1px solid #1a4070;}
.ctr-btn-gold{background:#1e1000;color:var(--gold2);border:1px solid rgba(201,168,76,.3);}
.ctr-btn-sec{background:var(--s3);color:var(--t3);border:1px solid var(--bd2);}
.ctr-btn-grn{background:#0a1f12;color:#4db87a;border:1px solid rgba(77,184,122,.3);}

/* ── Empty state ── */
.ctr-empty{text-align:center;padding:48px 20px;color:var(--t3);}

/* ── Modal melhorado: info do cliente ── */
.contr-cli-strip{background:rgba(96,160,224,.07);border:1px solid rgba(96,160,224,.15);border-radius:9px;padding:10px 13px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;}
.contr-cli-nm{font-size:.85rem;font-weight:700;color:#c8e6ff;}
.contr-cli-val{font-size:.75rem;color:#60a0e0;font-weight:600;}
.contr-cli-tipo{font-size:.65rem;color:rgba(96,160,224,.5);margin-top:1px;}
`;
  var styleEl = document.createElement('style');
  styleEl.id = 'ctr-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
})();

// ── DB: contratos ──
function _cDB() {
  if (!DB.c) {
    try { DB.c = JSON.parse(localStorage.getItem('hr_c') || '[]'); }
    catch(e) { DB.c = []; }
  }
  return DB.c;
}
function _cSv() {
  _cDB();
  localStorage.setItem('hr_c', JSON.stringify(DB.c));
}
function _cGet(qid) {
  return _cDB().find(function(c){ return String(c.qid) === String(qid); });
}
function _cStatus(qid) {
  var c = _cGet(qid);
  return c ? (c.status || 'gerado') : 'pendente';
}

// ── State ──
var _ctrSearch = '';
var _ctrFilter = 'all';

// ─────────────────────────────────────────
//  RENDER PRINCIPAL
// ─────────────────────────────────────────
function renderContratos() {
  var wrap = document.getElementById('ctrWrap');
  if (!wrap) return;
  _cDB(); // garante inicialização

  // Todos os orçamentos com cliente
  var allQs = (DB.q || []).filter(function(q){ return q.cli; });

  // Contagens por status
  var contGerados   = 0, contAssinados = 0, contPendentes = 0;
  allQs.forEach(function(q){
    var st = _cStatus(q.id);
    if (st === 'assinado')  contAssinados++;
    else if (st === 'gerado') contGerados++;
    else contPendentes++;
  });
  var valorContratos = DB.c.reduce(function(s,c){
    var q = (DB.q||[]).find(function(x){return String(x.id)===String(c.qid);});
    return s + (q ? (q.vista||0) : 0);
  }, 0);

  // Filtros aplicados
  var qs = allQs.slice();
  if (_ctrFilter === 'pendente')  qs = qs.filter(function(q){ return _cStatus(q.id) === 'pendente'; });
  if (_ctrFilter === 'gerado')    qs = qs.filter(function(q){ return _cStatus(q.id) === 'gerado'; });
  if (_ctrFilter === 'assinado')  qs = qs.filter(function(q){ return _cStatus(q.id) === 'assinado'; });
  if (_ctrSearch) {
    var s = _ctrSearch.toLowerCase();
    qs = qs.filter(function(q){
      return (q.cli||'').toLowerCase().indexOf(s)>=0 || (q.tipo||'').toLowerCase().indexOf(s)>=0;
    });
  }
  qs.sort(function(a,b){ return (b.id||0)-(a.id||0); });

  // ── Stats ──
  var statsHtml =
    '<div class="ctr-stats">' +
      _ctrStatCard('📋', allQs.length, 'Orçamentos') +
      _ctrStatCard('📜', contGerados, 'Gerados') +
      _ctrStatCard('✍️', contAssinados, 'Assinados') +
      _ctrStatCard('💰', 'R$\u00a0'+_ctrFmShort(valorContratos), 'Em contratos') +
    '</div>';

  // ── Tabs ──
  var tabsHtml =
    '<div class="ctr-tabs">' +
      _ctrTabEl('all',     'Todos',      allQs.length) +
      _ctrTabEl('pendente','Pendentes',  contPendentes) +
      _ctrTabEl('gerado',  'Gerados',    contGerados) +
      _ctrTabEl('assinado','Assinados',  contAssinados) +
    '</div>';

  // ── Search ──
  var searchHtml =
    '<div class="ctr-search-wrap">' +
      '<span style="font-size:.95rem;color:var(--t4);">🔍</span>' +
      '<input id="ctrSearchInp" type="text" placeholder="Buscar cliente ou tipo..." ' +
        'value="'+escH(_ctrSearch)+'" oninput="ctrSearchChange(this.value)" ' +
        'style="flex:1;background:none;border:none;outline:none;color:var(--tx);font-family:Outfit,sans-serif;font-size:.82rem;">' +
      (_ctrSearch ? '<button onclick="ctrSearchChange(\'\')" style="background:none;border:none;color:var(--t3);font-size:.75rem;cursor:pointer;padding:0 2px;">✕</button>' : '') +
    '</div>';

  // ── Lista ──
  var listHtml = '';
  if (qs.length === 0) {
    listHtml =
      '<div class="ctr-empty">' +
        '<div style="font-size:2.2rem;margin-bottom:10px;">📜</div>' +
        '<div style="font-size:.82rem;font-weight:600;color:var(--t2);margin-bottom:4px;">' +
          (_ctrSearch || _ctrFilter !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhum orçamento cadastrado') +
        '</div>' +
        '<div style="font-size:.72rem;color:var(--t4);">' +
          (_ctrSearch || _ctrFilter !== 'all'
            ? 'Tente outro filtro ou busca'
            : 'Crie orçamentos para gerar contratos') +
        '</div>' +
      '</div>';
  } else {
    qs.forEach(function(q){ listHtml += _ctrCardHtml(q); });
  }

  wrap.innerHTML =
    statsHtml + tabsHtml + searchHtml +
    '<div class="ctr-list" id="ctrList">'+listHtml+'</div>';
}

function _ctrFmShort(v) {
  var n = parseFloat(v||0);
  if (n >= 1000) return (n/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k';
  return n.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
}

function _ctrStatCard(icon, val, lbl) {
  return '<div class="ctr-stat">'+
    '<div class="ctr-stat-icon">'+icon+'</div>'+
    '<div class="ctr-stat-val">'+val+'</div>'+
    '<div class="ctr-stat-lbl">'+lbl+'</div>'+
  '</div>';
}

function _ctrTabEl(id, lbl, count) {
  var on = _ctrFilter === id ? ' on' : '';
  return '<div class="ctr-tab'+on+'" onclick="ctrSetFilter(\''+id+'\')">' +
    lbl +
    (count > 0 ? ' <span class="ctr-tab-cnt">'+count+'</span>' : '') +
  '</div>';
}

function _ctrCardHtml(q) {
  var status = _cStatus(q.id);
  var c = _cGet(q.id);
  var dt = '';
  if (q.id) {
    try { dt = new Date(q.id).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'}); } catch(e){}
  }
  var stLabel = {pendente:'Pendente', gerado:'Gerado', assinado:'Assinado'}[status]||status;

  var actions = '';
  // Botão principal: gerar/regerar
  actions += '<button class="ctr-btn-sm ctr-btn-pri" onclick="event.stopPropagation();ctrAbrirConfig('+q.id+')">'+
    (status === 'pendente' ? '📜 Gerar' : '🔄 Regerar') +
  '</button>';
  // Marcar assinado
  if (status === 'gerado') {
    actions += '<button class="ctr-btn-sm ctr-btn-gold" onclick="event.stopPropagation();ctrMarcarStatus('+q.id+',\'assinado\')" title="Marcar como assinado">✍️</button>';
  }
  // Resetar
  if (status !== 'pendente') {
    actions += '<button class="ctr-btn-sm ctr-btn-sec" onclick="event.stopPropagation();ctrMarcarStatus('+q.id+',\'pendente\')" title="Marcar como pendente">↩</button>';
  }

  return '<div class="ctr-card" onclick="ctrAbrirConfig('+q.id+')">' +
    '<div class="ctr-card-left">' +
      '<div class="ctr-card-cli">'+escH(q.cli||'Cliente')+'</div>' +
      '<div class="ctr-card-meta">' +
        '<span>'+escH(q.tipo||'Projeto')+'</span>'+
        (q.mat ? '<span>· '+escH(q.mat)+'</span>' : '') +
        (dt ? '<span>· '+dt+'</span>' : '') +
      '</div>' +
      (c && c.dtGerado ? '<div class="ctr-card-dtg">📄 Gerado em '+c.dtGerado+'</div>' : '') +
    '</div>' +
    '<div class="ctr-card-right">' +
      '<div class="ctr-card-val">R$ '+fm(q.vista||0)+'</div>' +
      '<div class="ctr-badge ctr-badge-'+status+'">'+stLabel+'</div>' +
      '<div class="ctr-card-actions">'+actions+'</div>' +
    '</div>' +
  '</div>';
}

// ─────────────────────────────────────────
//  SEARCH / FILTER
// ─────────────────────────────────────────
function ctrSearchChange(v) {
  _ctrSearch = v;
  renderContratos();
  // Mantém o foco no campo após re-render
  var inp = document.getElementById('ctrSearchInp');
  if (inp) { inp.focus(); var len = inp.value.length; inp.setSelectionRange(len,len); }
}

function ctrSetFilter(f) {
  _ctrFilter = f;
  _ctrSearch = '';
  renderContratos();
}

// ─────────────────────────────────────────
//  STATUS
// ─────────────────────────────────────────
function ctrMarcarStatus(qid, status) {
  _cDB();
  var c = _cGet(qid);
  if (!c) {
    if (status === 'pendente') return; // já é pendente
    c = { qid: String(qid), status: status, dtGerado: new Date().toLocaleDateString('pt-BR') };
    DB.c.push(c);
  } else {
    if (status === 'pendente') {
      DB.c = DB.c.filter(function(x){ return String(x.qid) !== String(qid); });
    } else {
      c.status = status;
    }
  }
  _cSv();
  renderContratos();
  var msgs = { assinado:'✍️ Marcado como assinado!', pendente:'↩ Resetado para pendente', gerado:'📜 Marcado como gerado' };
  toast(msgs[status] || '✓ Status atualizado');
}

// ─────────────────────────────────────────
//  ABRIR CONFIG CONTRATO
// ─────────────────────────────────────────
function ctrAbrirConfig(id) {
  var q = (DB.q||[]).find(function(x){ return x.id==id; });
  if (!q) { toast('Orçamento não encontrado'); return; }

  // Preenche strip do cliente no modal
  var cliEl  = document.getElementById('contrCliNm');
  var valEl  = document.getElementById('contrCliVal');
  var tipoEl = document.getElementById('contrCliTipo');
  if (cliEl)  cliEl.textContent  = q.cli || 'Cliente';
  if (valEl)  valEl.textContent  = 'R$ ' + fm(q.vista||0);
  if (tipoEl) tipoEl.textContent = (q.tipo||'') + (q.mat ? ' · ' + q.mat : '');

  // Usa a função existente de abertura
  if (typeof gerarContrato === 'function') {
    gerarContrato(id);
  } else {
    toast('Erro: módulo de contrato não carregado');
  }

  // Guarda ID para salvar no DB.c quando confirmar
  window._ctrQidAtivo = id;
}

// ─────────────────────────────────────────
//  HOOK: salvar no DB.c quando contrato é gerado
// ─────────────────────────────────────────
(function patchConfirmarContrato(){
  // Aguarda o carregamento de contrato.js
  var tentativas = 0;
  var t = setInterval(function(){
    tentativas++;
    if (typeof confirmarContrato === 'function' && !confirmarContrato._ctrPatched) {
      var _orig = confirmarContrato;
      confirmarContrato = function(){
        _orig.apply(this, arguments);
        // Após gerar, salva o registro em DB.c
        var qid = window._ctrQidAtivo || window._contrId;
        if (qid) {
          _cDB();
          var existing = _cGet(qid);
          if (!existing) {
            DB.c.push({ qid: String(qid), status: 'gerado', dtGerado: new Date().toLocaleDateString('pt-BR') });
          } else {
            existing.status = 'gerado';
            existing.dtGerado = new Date().toLocaleDateString('pt-BR');
          }
          _cSv();
          // Atualiza a página se estiver visível
          setTimeout(function(){
            var pg = document.getElementById('pg10');
            if (pg && pg.classList.contains('on')) renderContratos();
          }, 400);
        }
      };
      confirmarContrato._ctrPatched = true;
      clearInterval(t);
    }
    if (tentativas > 40) clearInterval(t);
  }, 150);
})();
