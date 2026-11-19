// app-garantias.js — v2 (fotos da entrega). v1: 🛡️ Garantias dos clientes (dados no bot, banco D1: nada se perde ao trocar de celular)
// Secretária → cartão "Garantias" → lista com busca e filtros, detalhes, certificado e contrato em PDF,
// reenviar ao cliente pelo WhatsApp oficial, anotações, nova garantia (serviços antigos) e exportar planilha (CSV).
(function () {
  'use strict';
  if (window.__hrGar) return; window.__hrGar = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function br(iso) { var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '—'; }
  function hoje() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); }
  function dias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  var MOD = { instalacao: 'Fabricação + instalação', entrega: 'Fabricação (sem instalação)', retirada: 'Fabricação (retirada)' };
  var SIT = { ativa: ['Ativa', '52,211,153'], vencida: ['Vencida', '154,145,126'], aguardando_entrega: ['Aguardando entrega', '232,201,106'], aguardando_dados: ['Aguardando nome e CPF', '251,146,60'], cancelada: ['Cancelada', '248,113,113'] };
  var st = { lista: [], filtro: 'todas', q: '' };

  var CSS = '#hrGar{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:garEntra .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrGar::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 50% at 90% -10%,rgba(201,168,76,.16),transparent 60%)}#hrGar>*{position:relative}#hrGar *{box-sizing:border-box}'
    + '.gar-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.28)}'
    + '.gar-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.gar-sub{font-size:.72rem;color:#9a917e}'
    + '.gar-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none}'
    + '.gar-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 12px 4px}.gar-kpi{border-radius:14px;padding:10px;background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.06);text-align:center}'
    + '.gar-kpi b{display:block;font-size:1.35rem;color:#f0d78c}.gar-kpi span{font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:#9a917e}'
    + '.gar-busca{margin:8px 12px 4px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.2);border-radius:14px;padding:0 12px}'
    + '.gar-busca input{flex:1;background:none!important;border:none!important;box-shadow:none!important;color:#efe9dc;padding:11px 4px;font-size:.92rem;outline:none;font-family:inherit;margin:0}'
    + '.gar-chips{display:flex;gap:7px;padding:6px 12px 10px;overflow-x:auto;scrollbar-width:none}.gar-chip{flex:none;border:1px solid rgba(201,168,76,.25);background:rgba(255,255,255,.03);color:#b9ad92;border-radius:20px;padding:6px 12px;font-size:.76rem;font-weight:600;font-family:inherit;cursor:pointer}'
    + '.gar-chip.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border-color:transparent}'
    + '.gar-lista{flex:1;overflow-y:auto;padding:0 12px 90px}'
    + '.gar-card{border-radius:16px;padding:12px 13px;margin-bottom:9px;background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.06);cursor:pointer;opacity:0;animation:garSobe .4s cubic-bezier(.2,.9,.25,1) forwards}'
    + '.gar-l1{display:flex;align-items:center;gap:8px}.gar-id{font-size:.68rem;font-weight:800;color:#1a1408;background:#c9a84c;border-radius:6px;padding:1px 6px}.gar-nm{flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.gar-st{font-size:.66rem;font-weight:700;border-radius:10px;padding:2px 8px}.gar-sv{font-size:.78rem;color:#b9ad92;margin-top:4px}'
    + '.gar-bar{height:5px;border-radius:4px;background:rgba(255,255,255,.07);margin-top:9px;overflow:hidden}.gar-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#c9a84c,#f0d78c)}'
    + '.gar-dt{display:flex;justify-content:space-between;font-size:.66rem;color:#857b66;margin-top:4px}'
    + '.gar-fab{position:absolute;left:auto!important;width:auto!important;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));padding:14px 18px;border-radius:30px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-family:inherit;font-size:.9rem;box-shadow:0 8px 24px rgba(201,168,76,.4);cursor:pointer}'
    + '.gar-sheet{position:fixed;inset:0;z-index:9992;background:rgba(0,0,0,.7);display:flex;align-items:flex-end;animation:garEntra .2s ease}'
    + '.gar-sh{width:100%;max-height:92vh;overflow-y:auto;background:#12100c;border-top:1.5px solid #c9a84c;border-radius:20px 20px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom))}'
    + '.gar-sh h3{margin:0 0 2px;font-family:"Cormorant Garamond",serif;font-size:1.4rem;color:#f0d78c}.gar-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.84rem}.gar-row span:first-child{color:#9a917e}'
    + '.gar-bts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.gar-bt{padding:12px;border-radius:12px;border:1px solid rgba(201,168,76,.35);background:rgba(201,168,76,.08);color:#f0d78c;font-weight:700;font-family:inherit;font-size:.82rem;cursor:pointer}'
    + '.gar-bt.pri{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border:none}.gar-bt.zap{background:#1fae5b;color:#05140b;border:none}'
    + '.gar-ev{font-size:.76rem;padding:7px 0 7px 14px;border-left:2px solid rgba(201,168,76,.4);margin-left:4px;color:#d8ccb0}.gar-ev small{display:block;color:#857b66}'
    + '.gar-f label{display:block;font-size:.72rem;color:#9a917e;margin:10px 0 4px}.gar-f input,.gar-f select,.gar-f textarea{width:100%;padding:11px;border-radius:10px;border:1px solid rgba(201,168,76,.25);background:#1b1813;color:#efe9dc;font:inherit;font-size:.9rem}'
    + '.gar-vazio{text-align:center;color:#9a917e;padding:50px 20px;line-height:1.6}'
    + '@keyframes garEntra{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes garSobe{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    + '.gar-card-sec{position:relative;display:flex;align-items:center;gap:13px;width:calc(100% - 24px);margin:6px 12px;padding:14px;border-radius:18px;border:1px solid rgba(201,168,76,.4);background:radial-gradient(120% 140% at 0% 0%,rgba(232,201,106,.16),transparent 55%),linear-gradient(135deg,#1d1810,#0f0d0a);color:#f4eee2;font-family:inherit;text-align:left;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.45)}'
    + '.gar-card-sec .ic{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:1.45rem;background:linear-gradient(135deg,#e8c96a,#a8862f);flex:none}'
    + '.gar-card-sec .t{font-family:"Cormorant Garamond",serif;font-size:1.22rem;font-weight:700;color:#f0d78c}.gar-card-sec .s{font-size:.72rem;color:#a99d84;margin-top:2px}';

  function css() { if (!document.getElementById('hrGarCss')) { var s = document.createElement('style'); s.id = 'hrGarCss'; s.textContent = CSS; document.head.appendChild(s); } }
  function api(cam, op) {
    var b = base(); if (!b) return Promise.reject(new Error('O bot não está configurado neste aparelho.'));
    return fetch(b + cam, op || { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.error) throw new Error(j.error); return j; });
  }
  function abrirPdf(g, tipo) {
    aviso('Abrindo ' + (tipo === 'contrato' ? 'contrato' : 'certificado') + '…');
    fetch(base() + '/bot/garantias/pdf?id=' + encodeURIComponent(g.id) + (tipo === 'contrato' ? '&tipo=contrato' : ''), { headers: hdr() })
      .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'PDF indisponível'); }); return r.blob(); })
      .then(function (b) { var u = URL.createObjectURL(b), w = window.open(u, '_blank'); if (!w) { var a = document.createElement('a'); a.href = u; a.download = (tipo === 'contrato' ? 'Contrato ' : 'Garantia ') + g.id + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); } })
      .catch(function (e) { aviso('⚠️ ' + e.message); });
  }

  function abrir() {
    css(); fechar();
    var d = document.createElement('div'); d.id = 'hrGar'; document.body.appendChild(d);
    d.innerHTML = '<div class="gar-top"><button class="gar-ic" data-a="sair">←</button><div style="flex:1;"><b>🛡️ Garantias</b><div class="gar-sub" id="garSub">Carregando…</div></div>'
      + '<button class="gar-ic" data-a="csv" title="Exportar planilha">⤓</button><button class="gar-ic" data-a="rec" title="Atualizar">⟳</button></div>'
      + '<div class="gar-kpis" id="garKpis"></div>'
      + '<div class="gar-busca"><span style="color:#c9a84c;">🔍</span><input id="garQ" placeholder="Cliente, nº, serviço ou telefone" autocomplete="off"></div>'
      + '<div class="gar-chips" id="garChips"></div><div class="gar-lista" id="garLista"><div class="gar-vazio">Carregando…</div></div>'
      + '<button class="gar-fab" data-a="nova">＋ Nova garantia</button>';
    d.onclick = function (ev) {
      var a = ev.target.closest('[data-a]'); if (a) { var x = a.getAttribute('data-a');
        if (x === 'sair') fechar(); else if (x === 'rec') carregar(); else if (x === 'csv') csv(); else if (x === 'nova') form(null); return; }
      var f = ev.target.closest('[data-f]'); if (f) { st.filtro = f.getAttribute('data-f'); desenhar(); return; }
      var c = ev.target.closest('[data-g]'); if (c) detalhe(st.lista.find(function (g) { return g.id === c.getAttribute('data-g'); }));
    };
    document.getElementById('garQ').oninput = function () { st.q = this.value; desenhar(); };
    carregar();
  }
  function fechar() { var e = document.getElementById('hrGar'); if (e) e.remove(); var s = document.querySelector('.gar-sheet'); if (s) s.remove(); }
  function carregar() { return api('/bot/garantias').then(function (j) { st.lista = j.garantias || []; desenhar(); }).catch(function (e) { var l = document.getElementById('garLista'); if (l) l.innerHTML = '<div class="gar-vazio">⚠️ ' + esc(e.message) + '</div>'; }); }
  function chamados(g) { return (g.eventos || []).filter(function (e) { return e.tipo === 'chamado'; }); }
  function desenhar() {
    var l = document.getElementById('garLista'); if (!l) return;
    var h = hoje(), at = st.lista.filter(function (g) { return g.situacao === 'ativa'; });
    var v30 = at.filter(function (g) { return dias(h, g.validade) <= 30; }), ch = st.lista.filter(function (g) { return chamados(g).length; });
    document.getElementById('garSub').textContent = st.lista.length + ' garantia(s) guardada(s)';
    document.getElementById('garKpis').innerHTML = '<div class="gar-kpi"><b>' + at.length + '</b><span>Ativas</span></div><div class="gar-kpi"><b>' + v30.length + '</b><span>Vencem em 30d</span></div><div class="gar-kpi"><b>' + ch.length + '</b><span>Com chamado</span></div>';
    var F = [['todas', 'Todas', st.lista.length], ['ativa', 'Ativas', at.length], ['v30', 'Vencendo', v30.length], ['aguardando_entrega', 'Aguardando entrega', st.lista.filter(function (g) { return g.situacao === 'aguardando_entrega'; }).length], ['aguardando_dados', 'Sem CPF', st.lista.filter(function (g) { return g.situacao === 'aguardando_dados'; }).length], ['vencida', 'Vencidas', st.lista.filter(function (g) { return g.situacao === 'vencida'; }).length], ['ch', 'Chamados', ch.length]];
    document.getElementById('garChips').innerHTML = F.map(function (f) { return '<button class="gar-chip' + (st.filtro === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + ' · ' + f[2] + '</button>'; }).join('');
    var q = String(st.q || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
    var lista = st.lista.filter(function (g) {
      if (st.filtro === 'v30' && !(g.situacao === 'ativa' && dias(h, g.validade) <= 30)) return false;
      if (st.filtro === 'ch' && !chamados(g).length) return false;
      if (['ativa', 'vencida', 'aguardando_entrega', 'aguardando_dados'].indexOf(st.filtro) >= 0 && g.situacao !== st.filtro) return false;
      if (!q) return true;
      return [g.id, g.cliente, g.servico, g.material, g.orc_num].join(' ').toLowerCase().indexOf(q) >= 0 || (qd.length >= 4 && String(g.num || '').indexOf(qd) >= 0);
    });
    l.innerHTML = lista.map(function (g, i) {
      var s = SIT[g.situacao] || SIT.ativa, pct = g.inicio ? Math.max(0, Math.min(100, dias(g.inicio, h) / 365 * 100)) : 0, falta = g.validade ? dias(h, g.validade) : 0;
      return '<div class="gar-card" style="animation-delay:' + Math.min(i, 14) * 0.035 + 's" data-g="' + esc(g.id) + '"><div class="gar-l1"><span class="gar-id">' + esc(g.id) + '</span><span class="gar-nm">' + esc(g.cliente) + '</span>'
        + (chamados(g).length ? '<span title="Chamado">⚠️</span>' : '') + '<span class="gar-st" style="background:rgba(' + s[1] + ',.15);color:rgb(' + s[1] + ');">' + s[0] + '</span></div>'
        + '<div class="gar-sv">' + esc([g.servico, g.material].filter(Boolean).join(' em ') || 'Serviço') + ' · ' + esc(MOD[g.modalidade] || '') + '</div>'
        + (g.inicio ? '<div class="gar-bar"><i style="width:' + pct.toFixed(1) + '%;' + (g.situacao === 'vencida' ? 'background:#5f5747;' : '') + '"></i></div><div class="gar-dt"><span>' + br(g.inicio) + '</span><span>' + (g.situacao === 'ativa' ? (falta <= 30 ? '⏳ ' : '') + 'faltam ' + falta + ' dias' : '') + '</span><span>' + br(g.validade) + '</span></div>' : '<div class="gar-dt"><span>Começa a valer na entrega</span></div>')
        + '</div>';
    }).join('') || '<div class="gar-vazio">' + (st.lista.length ? 'Nada neste filtro.' : 'Nenhuma garantia ainda.<br>Elas nascem sozinhas no contrato aceito e na entrega.<br>Para serviços antigos, toque em <b>＋ Nova garantia</b>.') + '</div>';
  }
  function sheet(html) { var s = document.createElement('div'); s.className = 'gar-sheet'; s.innerHTML = '<div class="gar-sh">' + html + '</div>'; s.addEventListener('click', function (e) { if (e.target === s) s.remove(); }); document.body.appendChild(s); return s; }
  function detalhe(g) {
    if (!g) return; var s = SIT[g.situacao] || SIT.ativa, pecas = []; try { pecas = JSON.parse(g.pecas || '[]'); } catch (e) {}
    var num = String(g.num || '').replace(/\D/g, ''); if (num && num.indexOf('55') !== 0) num = '55' + num;
    var sh = sheet('<h3>' + esc(g.cliente) + '</h3><div style="font-size:.78rem;color:#9a917e;margin-bottom:8px;"><b style="color:#e8c96a;">' + esc(g.id) + '</b> · <span style="color:rgb(' + s[1] + ');">' + s[0] + '</span></div>'
      + [['Serviço', [g.servico, g.material].filter(Boolean).join(' em ')], ['Cobertura', MOD[g.modalidade]], ['Vigência', g.inicio ? br(g.inicio) + ' a ' + br(g.validade) : 'Começa na entrega'], ['Telefone', (function (d) { d = String(d || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d; })(g.num)], ['CPF', g.cpf], ['Endereço', g.endereco], ['Orçamento', g.orc_num], ['Contrato', g.contrato_n ? g.contrato_n + (g.aceite_em ? ' · aceito em ' + new Date(g.aceite_em).toLocaleString('pt-BR') : ' · aguardando aceite') : ''], ['Valor', g.valor ? 'R$ ' + Number(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''], ['Origem', g.origem]]
        .filter(function (r) { return r[1]; }).map(function (r) { return '<div class="gar-row"><span>' + r[0] + '</span><span style="text-align:right;">' + esc(r[1]) + '</span></div>'; }).join('')
      + (pecas.length ? '<div style="font-size:.76rem;color:#d8ccb0;margin-top:8px;">' + pecas.map(esc).join('<br>') + '</div>' : '')
      + '<div class="gar-bts">' + (g.inicio ? '<button class="gar-bt pri" data-x="cert">📄 Certificado</button>' : '') + (g.tem_contrato ? '<button class="gar-bt" data-x="ct">✍️ Contrato</button>' : '')
      + (num && g.inicio ? '<button class="gar-bt" data-x="env">🤖 Mandar ao cliente</button>' : '') + (num ? '<a class="gar-bt zap" style="text-align:center;text-decoration:none;" href="https://wa.me/' + num + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '')
      + '<button class="gar-bt" data-x="nota">📝 Anotação</button><button class="gar-bt" data-x="edit">✏️ Editar</button></div>'
      + '<div id="garFotos"></div>'
      + '<div style="margin-top:16px;font-size:.62rem;letter-spacing:.14em;color:#c9a84c;font-weight:800;">HISTÓRICO</div>'
      + ((g.eventos || []).map(function (e) { return '<div class="gar-ev"><small>' + new Date(e.ts).toLocaleString('pt-BR') + ' · ' + esc(e.tipo) + '</small>' + esc(e.texto) + '</div>'; }).join('') || '<div class="gar-ev">Sem eventos.</div>')
      + (g.situacao !== 'cancelada' ? '<button class="gar-bt" data-x="canc" style="width:100%;margin-top:14px;color:#f87171;border-color:rgba(248,113,113,.35);background:transparent;">Cancelar garantia</button>' : ''));
    api('/bot/garantias/fotos?id=' + encodeURIComponent(g.id)).then(function (j) { // v2: fotos da entrega (comprovante)
      var fs = (j && j.fotos) || [], box = sh.querySelector('#garFotos'); if (!fs.length || !box) return;
      box.innerHTML = '<div style="margin-top:16px;font-size:.62rem;letter-spacing:.14em;color:#c9a84c;font-weight:800;">📸 FOTOS DA ENTREGA</div><div style="display:flex;gap:8px;overflow-x:auto;margin-top:8px;">' + fs.map(function (f) { return '<img data-foto="' + f.id + '" style="width:110px;height:110px;object-fit:cover;border-radius:12px;border:1px solid rgba(201,168,76,.35);background:#1b1813;flex:none;cursor:zoom-in;" alt="">'; }).join('') + '</div>';
      box.querySelectorAll('img[data-foto]').forEach(function (im) { fetch(base() + '/bot/garantias/fotos?id=' + encodeURIComponent(g.id) + '&n=' + im.getAttribute('data-foto'), { headers: hdr() }).then(function (r) { return r.blob(); }).then(function (b) { im.src = URL.createObjectURL(b); }); });
    }).catch(function () {});
    sh.onclick = function (e) {
      if (e.target === sh) { sh.remove(); return; }
      var im = e.target.closest('img[data-foto]'); if (im && im.src) { window.open(im.src, '_blank'); return; }
      var b = e.target.closest('[data-x]'); if (!b) return; var x = b.getAttribute('data-x');
      if (x === 'cert') abrirPdf(g, 'cert'); else if (x === 'ct') abrirPdf(g, 'contrato');
      else if (x === 'env') api('/bot/garantias', { method: 'POST', headers: hdr(true), body: JSON.stringify({ acao: 'reenviar', id: g.id }) }).then(function (j) { aviso((j.ok ? '✅ ' : '⚠️ ') + j.texto); carregar(); }).catch(function (er) { aviso('⚠️ ' + er.message); });
      else if (x === 'nota') { var t = prompt('Anotação para ' + g.id + ':'); if (t) api('/bot/garantias', { method: 'POST', headers: hdr(true), body: JSON.stringify({ acao: 'nota', id: g.id, texto: t }) }).then(function () { aviso('✓ Anotado'); sh.remove(); carregar(); }); }
      else if (x === 'canc') { var mt = prompt('Motivo do cancelamento da garantia ' + g.id + ':'); if (mt != null) api('/bot/garantias', { method: 'POST', headers: hdr(true), body: JSON.stringify({ acao: 'cancelar', id: g.id, motivo: mt }) }).then(function () { aviso('Garantia cancelada'); sh.remove(); carregar(); }); }
      else if (x === 'edit') { sh.remove(); form(g); }
    };
  }
  function form(g) {
    g = g || {};
    var sh = sheet('<h3>' + (g.id ? 'Editar ' + esc(g.id) : 'Nova garantia') + '</h3><div style="font-size:.76rem;color:#9a917e;">' + (g.id ? '' : 'Para serviços entregues antes do sistema. Vale 1 ano a partir da data da entrega.') + '</div><div class="gar-f">'
      + '<label>Cliente</label><input id="gfCli" value="' + esc(g.cliente || '') + '">'
      + '<label>WhatsApp (DDD + número)</label><input id="gfTel" inputmode="tel" value="' + esc(String(g.num || '').replace(/^55/, '')) + '">'
      + '<label>Serviço</label><input id="gfSv" placeholder="Ex.: Bancada de cozinha" value="' + esc(g.servico || '') + '">'
      + '<label>Pedra</label><input id="gfMt" placeholder="Ex.: Preto São Gabriel" value="' + esc(g.material || '') + '">'
      + '<label>Cobertura</label><select id="gfMd"><option value="instalacao">Fabricação + instalação (instalado pela HR)</option><option value="entrega">Fabricação (entregue sem instalação)</option><option value="retirada">Fabricação (retirada pelo cliente)</option></select>'
      + '<label>Data da entrega/instalação</label><input id="gfIni" type="date" value="' + esc(g.inicio || '') + '">'
      + '<label>CPF (opcional)</label><input id="gfCpf" value="' + esc(g.cpf || '') + '">'
      + '<label>Endereço (opcional)</label><input id="gfEnd" value="' + esc(g.endereco || '') + '">'
      + (g.id ? '' : '<label style="display:flex;gap:8px;align-items:center;font-size:.82rem;color:#d8ccb0;"><input id="gfEnv" type="checkbox" style="width:auto;"> Mandar o certificado ao cliente agora</label>')
      + '</div><div class="gar-bts"><button class="gar-bt" data-x="x">Cancelar</button><button class="gar-bt pri" data-x="ok">Salvar</button></div>');
    var md = sh.querySelector('#gfMd'); if (g.modalidade) md.value = g.modalidade;
    sh.onclick = function (e) {
      if (e.target === sh) { sh.remove(); return; }
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.getAttribute('data-x') === 'x') { sh.remove(); return; }
      var v = function (id) { var el = sh.querySelector('#' + id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
      if (!v('gfCli')) { aviso('⚠️ Coloque o nome do cliente'); return; }
      b.disabled = true; b.textContent = 'Salvando…';
      api('/bot/garantias', { method: 'POST', headers: hdr(true), body: JSON.stringify({ id: g.id || undefined, cliente: v('gfCli'), tel: v('gfTel'), servico: v('gfSv'), material: v('gfMt'), modalidade: v('gfMd'), inicio: v('gfIni'), cpf: v('gfCpf').replace(/\D/g, ''), endereco: v('gfEnd'), enviar: !!v('gfEnv') }) })
        .then(function (j) { aviso('✅ Garantia ' + j.id + ' salva'); sh.remove(); carregar(); }).catch(function (er) { b.disabled = false; b.textContent = 'Salvar'; aviso('⚠️ ' + er.message); });
    };
  }
  function csv() {
    var linhas = [['Nº', 'Cliente', 'Telefone', 'CPF', 'Serviço', 'Pedra', 'Cobertura', 'Início', 'Validade', 'Situação', 'Orçamento', 'Contrato', 'Aceite', 'Valor']].concat(st.lista.map(function (g) {
      return [g.id, g.cliente, g.num, g.cpf, g.servico, g.material, MOD[g.modalidade] || '', br(g.inicio), br(g.validade), (SIT[g.situacao] || [''])[0], g.orc_num, g.contrato_n, g.aceite_em ? new Date(g.aceite_em).toLocaleString('pt-BR') : '', g.valor || ''];
    }));
    var txt = '﻿' + linhas.map(function (l) { return l.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = 'garantias-HR-' + hoje() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  // cartão na Secretária (abaixo das Conversas)
  function cartao() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-gar-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'gar-card-sec'; b.setAttribute('data-gar-btn', '1');
    b.innerHTML = '<span class="ic">🛡️</span><div style="flex:1;"><div class="t">Garantias dos clientes</div><div class="s">Certificados, contratos, vencimentos e chamados</div></div><span style="color:#c9a84c;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var conv = sb.querySelector('[data-conv-btn]'); if (conv && conv.nextSibling) sb.insertBefore(b, conv.nextSibling); else sb.insertBefore(b, sb.firstChild);
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartao(); new MutationObserver(cartao).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirGarantias = abrir;
})();
