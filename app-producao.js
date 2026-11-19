// app-producao.js — v2 (previsão de pronto): 🏭 Ficha de produção (dados no bot: /bot/producao)
// Secretária → "Produção": cada pedido em produção com as etapas (corte, polimento, Hugo, acabamento), as partes e os pontos.
// Na ficha o Sr. Hangel confere o tipo de cada peça (bancada, frontão, saia, tampo), a saia, a cuba, o rebaixo, o cooktop e quem faz cada etapa.
(function () {
  'use strict';
  if (window.__hrProd) return; window.__hrProd = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n1(v) { return String(Math.round((Number(v) || 0) * 10) / 10).replace('.', ','); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || 'Erro ' + r.status); return j; });
    });
  }
  var ET = { corte: '✂️ Corte', polimento: '✨ Polimento e acabamento das saias', fabricacao: '🛠️ Hugo (rebaixo, cuba, 45°)', acabamento: '🪨 Acabamento' };
  var TIPOS = [['bancada', 'Bancada'], ['frontao', 'Frontão'], ['saia', 'Saia'], ['tampo', 'Tampo do rebaixo'], ['peitoril', 'Peitoril'], ['soleira', 'Soleira'], ['outro', 'Outro']];
  var RESP = [['fabResp', 'Corte'], ['poliResp', 'Polimento'], ['fab2Resp', 'Hugo / fabricação'], ['acabResp', 'Acabamento'], ['entResp', 'Instalação / entrega']];
  var st = { d: null, aberto: null, ed: null };

  var CSS = '#hrPrd{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:prdIn .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrPrd::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 50% at 90% -10%,rgba(52,211,153,.12),transparent 60%)}#hrPrd>*{position:relative}#hrPrd *{box-sizing:border-box}'
    + '@keyframes prdIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'
    + '.prd-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.prd-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.prd-sub{font-size:.72rem;color:#9a917e}'
    + '.prd-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 8px}'
    + '.prd-body{flex:1;overflow-y:auto;padding:12px 12px 90px}'
    + '.prd-card{border-radius:16px;padding:13px;margin-bottom:10px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07)}'
    + '.prd-l1{display:flex;align-items:center;gap:10px;cursor:pointer}.prd-nm{font-weight:800;font-size:1rem}.prd-fn{font-size:.7rem;color:#9a917e}.prd-pt{margin-left:auto;text-align:right}.prd-pt b{display:block;color:#f0d78c}.prd-pt span{font-size:.6rem;color:#9a917e}'
    + '.prd-et{display:flex;gap:5px;margin-top:9px}.prd-et div{flex:1;border-radius:9px;padding:5px 3px;text-align:center;font-size:.62rem;line-height:1.25;background:rgba(255,255,255,.04)}'
    + '.prd-et div.ok{background:rgba(52,211,153,.13);color:#9ff0c6}.prd-et div.meio{background:rgba(232,165,48,.13);color:#f4c97a}'
    + '.prd-det{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.1);font-size:.78rem}.prd-det h4{margin:12px 0 5px;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:#c9a84c}'
    + '.prd-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)}.prd-row b{color:#efe9dc;font-weight:600}.prd-ok{color:#7ee2a8}.prd-no{color:#9a917e}'
    + '.prd-bt{width:100%;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-size:.92rem;margin-top:10px;cursor:pointer}'
    + '.prd-bt2{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:#f0d78c}'
    + '.prd-f{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0}.prd-f label{font-size:.66rem;color:#9a917e;display:block;margin-bottom:3px}'
    + '.prd-f select,.prd-pc select{width:100%;padding:9px;border-radius:10px;background:#16130e;color:#efe9dc;border:1px solid rgba(201,168,76,.25);font-size:.82rem}'
    + '.prd-pc{display:grid;grid-template-columns:1fr 128px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}.prd-pc small{color:#9a917e}'
    + '.prd-it{border-radius:12px;padding:10px;margin:8px 0;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}.prd-it b{color:#f0d78c}'
    + '.prd-p{font-size:.8rem;color:#c9bfa6;line-height:1.45;margin:8px 0}'
    + '.prd-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.03));border:1px solid rgba(52,211,153,.3);color:#efe9dc;cursor:pointer}'
    + '.prd-card-sec .ic{font-size:1.5rem}.prd-card-sec .t{font-weight:800}.prd-card-sec .s{font-size:.72rem;color:#9a917e}';
  function css() { if (document.getElementById('hrPrdCss')) return; var s = document.createElement('style'); s.id = 'hrPrdCss'; s.textContent = CSS; document.head.appendChild(s); }

  function nomeF(id) { var f = (st.d.equipe || []).find(function (x) { return x.id === String(id); }); return f ? f.nome : '—'; }
  function sel(nome, val, ops) { return '<select data-k="' + nome + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function cartao(p) {
    var ab = st.aberto === p.id;
    var h = '<div class="prd-card"><div class="prd-l1" data-p="' + esc(p.id) + '"><div><div class="prd-nm">' + esc(p.nome) + '</div><div class="prd-fn">' + esc(p.pedra) + ' · ' + esc(p.nivel) + (p.entrega ? ' · entrega ' + p.entrega.split('-').reverse().slice(0, 2).join('/') : '') + (p.previsao ? ' · <span style="color:' + (p.previsao.risco ? '#f87171' : '#7ee2a8') + '">' + (p.previsao.risco ? '⚠️ ' : '🔮 ') + 'pronto ' + new Date(p.previsao.fim).toLocaleString('pt-BR', { timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</span>' : '') + '</div></div><div class="prd-pt"><b>' + n1(p.total) + '</b><span>pts no serviço</span></div></div>';
    h += '<div class="prd-et">' + p.etapas.map(function (e) { var f = e.partes.filter(function (x) { return x.feito; }).length, t = e.partes.length || 1; return '<div class="' + (f >= t ? 'ok' : f ? 'meio' : '') + '">' + (ET[e.e] || e.e).split(' ')[0] + '<br>' + f + '/' + t + '</div>'; }).join('') + '</div>';
    if (ab) {
      h += '<div class="prd-det">';
      p.etapas.forEach(function (e) {
        h += '<h4>' + (ET[e.e] || e.e) + ' · ' + n1(e.pts) + ' pts</h4>' + e.partes.map(function (x) { return '<div class="prd-row"><span class="' + (x.feito ? 'prd-ok' : 'prd-no') + '">' + (x.feito ? '✅ ' : '⬜ ') + esc(x.nome) + '</span><b>' + n1(x.pts) + '</b></div>'; }).join('');
      });
      h += '<h4>👷 Quem faz</h4>' + RESP.map(function (r) { return p.resp[r[0]] ? '<div class="prd-row"><span>' + r[1] + '</span><b>' + esc(nomeF(p.resp[r[0]])) + '</b></div>' : ''; }).join('');
      h += '<button class="prd-bt" data-ed="' + esc(p.id) + '">📝 Conferir a ficha (peças, saia, cuba, quem faz)</button></div>';
    }
    return h + '</div>';
  }
  function editor(p) {
    var eq = [['', '—']].concat((st.d.equipe || []).map(function (f) { return [f.id, f.nome]; }));
    var h = '<div class="prd-p">Confira o que o orçamento trouxe. Isso define as partes de cada etapa e os pontos de cada um.</div>';
    p.itens.forEach(function (it) {
      h += '<div class="prd-it" data-it="' + it.i + '"><b>' + esc(it.ambiente || 'Item ' + (it.i + 1)) + '</b>'
        + '<div class="prd-f"><div><label>Saia</label>' + sel('saia', it.saia, [['', 'Sem saia'], ['reta', 'Reta (acabamento)'], ['slim', 'Slim (polimento)'], ['boleada', 'Boleada'], ['45', 'Em 45° (Hugo)']]) + '</div>'
        + '<div><label>Cuba</label>' + sel('cubaInst', it.cuba ? (it.cubaInst || '') : 'sem', [['sem', 'Sem cuba'], ['', 'Não sei'], ['sobrepor', 'De sobrepor'], ['embutida', 'Embutida'], ['flush', 'Flush'], ['esculpida', 'Esculpida']]) + '</div>'
        + '<div><label>Rebaixo</label>' + sel('rebaixo', it.rebaixo, [['', 'Sem rebaixo'], ['normal', 'Rebaixo'], ['americano', 'Rebaixo americano']]) + '</div>'
        + '<div><label>Cooktop</label>' + sel('cook', it.cook ? '1' : '', [['', 'Não'], ['1', 'Sim']]) + '</div></div>'
        + it.pecas.map(function (pc) { return '<div class="prd-pc" data-pc="' + pc.j + '"><span>' + (pc.qtd > 1 ? pc.qtd + '× ' : '') + pc.comp + '×' + pc.larg + ' cm' + (pc.rot ? ' <small>(' + esc(pc.rot) + ')</small>' : '') + (pc.conf ? '' : ' <small>· confira</small>') + '</span>' + sel('tipo', pc.tipo, TIPOS) + '</div>'; }).join('') + '</div>';
    });
    h += '<div class="prd-it"><b>Quem faz cada etapa</b><div class="prd-f">' + RESP.map(function (r) { return '<div><label>' + r[1] + '</label>' + sel('r_' + r[0], p.resp[r[0]] || '', eq) + '</div>'; }).join('') + '</div></div>';
    return h + '<button class="prd-bt" data-salvar="' + esc(p.id) + '">💾 Salvar ficha</button><button class="prd-bt prd-bt2" data-volta="1">Voltar</button>';
  }
  function desenhar() {
    var b = document.getElementById('prdBody'), d = st.d; if (!b || !d) return;
    var sub = document.getElementById('prdSub'); if (sub) sub.textContent = d.pedidos.length + ' pedido(s) em produção';
    if (st.ed) { var p = d.pedidos.find(function (x) { return x.id === st.ed; }); if (p) { b.innerHTML = '<div class="prd-nm" style="margin-bottom:6px">' + esc(p.nome) + '</div>' + editor(p); return; } st.ed = null; }
    b.innerHTML = d.pedidos.length ? d.pedidos.map(cartao).join('') + '<div class="prd-p">Toque num pedido para ver as partes de cada etapa, o que já foi feito e os pontos. Os funcionários marcam pelo WhatsApp (ex.: <i>poli os frontões da Maria</i>, <i>colei a cuba da Maria</i>).</div>' : '<div class="prd-p" style="text-align:center;padding:40px 0">Nenhum pedido em produção agora.</div>';
  }
  function coletar(pid) {
    var b = document.getElementById('prdBody'), itens = [], resp = {};
    b.querySelectorAll('[data-it]').forEach(function (el) {
      var g = function (k) { var s = el.querySelector('[data-k="' + k + '"]'); return s ? s.value : ''; };
      itens.push({ i: +el.getAttribute('data-it'), saia: g('saia'), cubaInst: g('cubaInst'), rebaixo: g('rebaixo'), cook: g('cook') === '1', pecas: Array.prototype.map.call(el.querySelectorAll('[data-pc]'), function (pc) { return { j: +pc.getAttribute('data-pc'), tipo: pc.querySelector('[data-k="tipo"]').value }; }) });
    });
    RESP.forEach(function (r) { var s = b.querySelector('[data-k="r_' + r[0] + '"]'); if (s) resp[r[0]] = s.value; });
    return { pid: pid, itens: itens, resp: resp };
  }
  function carregar() {
    var b = document.getElementById('prdBody'); if (b && !st.d) b.innerHTML = '<div class="prd-p" style="text-align:center;padding:40px 0">Carregando a produção…</div>';
    return api('/bot/producao').then(function (d) { st.d = d; desenhar(); }).catch(function (e) { if (b) b.innerHTML = '<div class="prd-p">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function abrir() {
    css(); var v = document.getElementById('hrPrd'); if (v) v.remove(); st.ed = null;
    var d = document.createElement('div'); d.id = 'hrPrd';
    d.innerHTML = '<div class="prd-top"><button class="prd-ic" data-a="sair">←</button><div style="flex:1;"><b>🏭 Produção</b><div class="prd-sub" id="prdSub">Carregando…</div></div><button class="prd-ic" data-a="rec">⟳</button></div><div class="prd-body" id="prdBody"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]'), ed = e.target.closest('[data-ed]'), sv = e.target.closest('[data-salvar]'), vo = e.target.closest('[data-volta]');
      if (a) { if (a.getAttribute('data-a') === 'sair') { if (st.ed) { st.ed = null; desenhar(); } else d.remove(); return; } carregar(); return; }
      if (ed) { st.ed = ed.getAttribute('data-ed'); desenhar(); document.getElementById('prdBody').scrollTop = 0; return; }
      if (vo) { st.ed = null; desenhar(); return; }
      if (sv) { sv.disabled = true; var pid = sv.getAttribute('data-salvar');
        api('/bot/producao/ficha', coletar(pid)).then(function (r) { aviso('✅ Ficha salva'); if (r.pedido) { var i = st.d.pedidos.findIndex(function (x) { return x.id === pid; }); if (i >= 0) st.d.pedidos[i] = r.pedido; } st.ed = null; st.aberto = pid; desenhar(); }).catch(function (er) { sv.disabled = false; aviso('⚠️ ' + er.message); }); return; }
      if (p) { var id = p.getAttribute('data-p'); st.aberto = st.aberto === id ? null : id; desenhar(); }
    });
    carregar();
  }
  function cartaoSec() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-prd-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'prd-card-sec'; b.setAttribute('data-prd-btn', '1');
    b.innerHTML = '<span class="ic">🏭</span><div style="flex:1;"><div class="t">Produção</div><div class="s">Etapas de cada pedido, partes, pontos e a ficha (peças, saia, cuba)</div></div><span style="color:#34d399;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-dsm-btn]') || sb.querySelector('[data-bon-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.appendChild(b);
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartaoSec(); new MutationObserver(cartaoSec).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirProducao = abrir;
})();
