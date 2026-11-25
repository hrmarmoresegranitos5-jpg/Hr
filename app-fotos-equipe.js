// app-fotos-equipe.js — v1: 📸 Fotos da equipe (dados no bot: /bot/fotos/*)
// Cada foto que a equipe manda pelo WhatsApp aparece aqui com o que a Helena entendeu (cliente + etapa) e como decidiu
// (legenda, regra, IA olhando a foto, escolha do funcionário). O Sr. Hangel confere, corrige ou desfaz com um toque.
// Cada correção vira exemplo para a IA da foto não repetir o erro.
(function () {
  'use strict';
  if (window.__hrFotosEq) return; window.__hrFotosEq = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || 'Erro ' + r.status); return j; });
    });
  }
  var ETAPAS = [['pronto', '✂️ Corte feito / peças prontas'], ['cti', '▶️ Começou o corte'], ['aci', '▶️ Começou o acabamento'], ['acf', '🪨 Terminou o acabamento'], ['ini', '📍 Começou a instalação'], ['fim', '✅ Terminou a instalação / entregou'], ['foto', '📷 Só guardar a foto']];
  var ORIG = { ia: '🤖 IA pela foto', 'ia+confirmou': '🤖 IA sugeriu · ele confirmou', regra: '📏 Regra (único serviço)', legenda: '✍️ Pela legenda', escolha: '👆 Ele escolheu na lista', 'escolha (ia sugeriu outro)': '👆 Ele escolheu (a IA sugeriu outro)', dono: '👤 Você' };
  var st = { d: null, aba: 'conf', ed: null, imgs: {} };

  var CSS = '#hrFeq{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:feqIn .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrFeq *{box-sizing:border-box}@keyframes feqIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'
    + '.feq-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.feq-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.feq-sub{font-size:.72rem;color:#9a917e}'
    + '.feq-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 8px}'
    + '.feq-tabs{display:flex;gap:6px;padding:10px 12px 0}.feq-tabs button{flex:1;padding:9px;border-radius:12px;border:1px solid rgba(201,168,76,.22);background:transparent;color:#c9bfa6;font-weight:700;font-size:.78rem;cursor:pointer}.feq-tabs button.on{background:rgba(201,168,76,.16);color:#f0d78c;border-color:rgba(201,168,76,.5)}'
    + '.feq-body{flex:1;overflow-y:auto;padding:12px 12px 90px}'
    + '.feq-card{display:flex;gap:11px;border-radius:16px;padding:11px;margin-bottom:10px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07)}'
    + '.feq-card.pend{border-color:rgba(232,165,48,.45);background:linear-gradient(135deg,rgba(232,165,48,.1),rgba(255,255,255,.01))}.feq-card.cor{opacity:.65}'
    + '.feq-th{width:86px;height:86px;flex:none;border-radius:12px;background:#16130e center/cover no-repeat;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:.6rem;color:#6f675a;cursor:pointer}'
    + '.feq-i{flex:1;min-width:0}.feq-l1{font-size:.7rem;color:#9a917e}.feq-leg{font-size:.86rem;margin:3px 0;font-style:italic;color:#efe9dc;word-break:break-word}'
    + '.feq-dec{font-size:.82rem;font-weight:700;color:#f0d78c}.feq-or{font-size:.66rem;color:#9a917e;margin-top:2px}.feq-chip{display:inline-block;font-size:.62rem;padding:2px 7px;border-radius:8px;margin-left:6px;background:rgba(255,255,255,.06)}'
    + '.feq-chip.ok{background:rgba(52,211,153,.15);color:#9ff0c6}.feq-chip.cor{background:rgba(248,113,113,.15);color:#fca5a5}'
    + '.feq-bts{display:flex;gap:6px;margin-top:8px}.feq-bts button{flex:1;padding:8px 4px;border-radius:10px;border:1px solid rgba(201,168,76,.25);background:rgba(201,168,76,.08);color:#f0d78c;font-size:.72rem;font-weight:700;cursor:pointer}'
    + '.feq-bts button.v{background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.35);color:#9ff0c6}.feq-bts button.d{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.3);color:#fca5a5}'
    + '.feq-ed{margin-top:8px;display:grid;gap:6px}.feq-ed select{width:100%;padding:9px;border-radius:10px;background:#16130e;color:#efe9dc;border:1px solid rgba(201,168,76,.25);font-size:.8rem}'
    + '.feq-p{font-size:.8rem;color:#c9bfa6;line-height:1.45;margin:8px 0}.feq-vazio{text-align:center;padding:40px 10px;color:#9a917e;font-size:.85rem}'
    + '.feq-zoom{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}.feq-zoom img{max-width:96%;max-height:90%;border-radius:10px}'
    + '.feq-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(96,165,250,.12),rgba(96,165,250,.03));border:1px solid rgba(96,165,250,.3);color:#efe9dc;cursor:pointer;font-family:inherit}'
    + '.feq-card-sec .ic{font-size:1.5rem}.feq-card-sec .t{font-weight:800}.feq-card-sec .s{font-size:.72rem;color:#9a917e}.feq-card-sec .n{background:#e8a530;color:#1a1408;border-radius:10px;padding:2px 8px;font-weight:800;font-size:.75rem}';
  function css() { if (document.getElementById('hrFeqCss')) return; var s = document.createElement('style'); s.id = 'hrFeqCss'; s.textContent = CSS; document.head.appendChild(s); }

  function hora(ts) { try { var d = new Date(ts); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function etTxt(a) { var e = ETAPAS.filter(function (x) { return x[0] === a; })[0]; return e ? e[1] : (st.d && st.d.acoes && st.d.acoes[a]) || a; }
  function opsPed(sel) { return '<option value="">— escolha o cliente —</option>' + (st.d.pedidos || []).map(function (p) { return '<option value="' + esc(p.id) + '"' + (String(sel) === String(p.id) ? ' selected' : '') + '>' + esc(p.nome) + ' · ' + esc(p.resumo) + (p.entregue ? ' (entregue)' : '') + '</option>'; }).join(''); }
  function opsEt(sel) { return '<option value="">— o que foi feito —</option>' + ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + (sel === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join(''); }
  function precisaConferir(x) { return x.status === 'feita' && /^(ia|regra|escolha \(ia)/.test(x.origem || ''); }

  function cartaoDec(x) {
    var ed = st.ed === 'd' + x.id, cls = x.status === 'corrigida' || x.status === 'desfeita' ? ' cor' : '';
    var chip = x.status === 'conferida' ? '<span class="feq-chip ok">conferida</span>' : x.status === 'corrigida' ? '<span class="feq-chip cor">corrigida</span>' : x.status === 'desfeita' ? '<span class="feq-chip cor">desfeita</span>' : '';
    var h = '<div class="feq-card' + cls + '"><div class="feq-th" data-mid="' + esc(x.mid) + '">foto</div><div class="feq-i">'
      + '<div class="feq-l1">' + esc(x.fnome) + ' · ' + hora(x.ts) + chip + '</div>'
      + '<div class="feq-leg">' + (x.leg ? '"' + esc(x.leg) + '"' : 'sem legenda') + '</div>'
      + '<div class="feq-dec">' + esc(etTxt(x.acao)) + ' — ' + esc(x.pnome) + '</div>'
      + '<div class="feq-or">' + esc(ORIG[x.origem] || x.origem || '') + (x.certeza ? ' · certeza ' + esc(x.certeza) : '') + (x.vejo ? ' · viu: ' + esc(x.vejo) : '') + (x.corr ? '<br>✏️ certo: ' + esc(x.corr) : '') + '</div>';
    if (x.status === 'feita' || x.status === 'conferida') {
      if (ed) h += '<div class="feq-ed"><select data-k="pid">' + opsPed(x.pid) + '</select><select data-k="et">' + opsEt('') + '</select><div class="feq-bts"><button class="v" data-salvar="' + x.id + '">💾 Corrigir</button><button data-cancela="1">Voltar</button></div></div>';
      else h += '<div class="feq-bts">' + (x.status === 'feita' ? '<button class="v" data-ok="' + x.id + '">✅ Certo</button>' : '') + '<button data-edit="' + x.id + '">✏️ Corrigir</button><button class="d" data-desf="' + x.id + '">↩️ Desfazer</button></div>';
    }
    return h + '</div></div>';
  }
  function cartaoPend(x) {
    return '<div class="feq-card pend"><div class="feq-th" data-mid="' + esc(x.mid) + '">foto</div><div class="feq-i">'
      + '<div class="feq-l1">' + esc(x.fnome) + ' · ' + hora(x.em) + (x.mids && x.mids.length > 1 ? ' · ' + x.mids.length + ' fotos' : '') + '<span class="feq-chip">esperando</span></div>'
      + '<div class="feq-leg">' + (x.leg ? '"' + esc(x.leg) + '"' : 'sem legenda') + '</div><div class="feq-or">A Helena ainda não sabe de qual serviço é. Escolha aqui:</div>'
      + '<div class="feq-ed"><select data-k="pid">' + opsPed('') + '</select><select data-k="et">' + opsEt('') + '</select><div class="feq-bts"><button class="v" data-pend="' + esc(x.tel) + '">💾 Registrar</button></div></div></div></div>';
  }
  function desenhar() {
    var b = document.getElementById('feqBody'), d = st.d; if (!b || !d) return;
    var conf = d.decisoes.filter(precisaConferir), n = conf.length + d.pendentes.length;
    var sub = document.getElementById('feqSub'); if (sub) sub.textContent = n ? n + ' para você conferir' : 'tudo conferido';
    document.querySelectorAll('#hrFeq .feq-tabs button').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-aba') === st.aba); });
    var h = '';
    if (st.aba === 'conf') {
      h += d.pendentes.map(cartaoPend).join('') + conf.map(cartaoDec).join('');
      if (!h) h = '<div class="feq-vazio">✅ Nada para conferir agora.<br>As fotos que a Helena decidiu sozinha (pela IA ou por regra) aparecem aqui para você confirmar ou corrigir.</div>';
      else h = '<div class="feq-p">Confira o que a Helena entendeu. <b>✅ Certo</b> confirma; <b>✏️ Corrigir</b> muda o cliente/etapa (ela desfaz o errado, registra o certo, avisa o funcionário e aprende); <b>↩️ Desfazer</b> tira o registro.</div>' + h;
    } else {
      h = d.decisoes.length ? d.decisoes.map(cartaoDec).join('') : '<div class="feq-vazio">Nenhuma foto registrada nos últimos 7 dias.</div>';
    }
    b.innerHTML = h; carregarFotos(b);
  }
  function carregarFotos(b) {
    b.querySelectorAll('[data-mid]').forEach(function (el) {
      var mid = el.getAttribute('data-mid'); if (!mid) return;
      if (st.imgs[mid]) { el.style.backgroundImage = 'url(' + st.imgs[mid] + ')'; el.textContent = ''; return; }
      if (st.imgs[mid] === false) { el.textContent = 'sem foto'; return; }
      fetch(base() + '/bot/fotos/img?mid=' + encodeURIComponent(mid), { headers: hdr() }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) { st.imgs[mid] = URL.createObjectURL(bl); el.style.backgroundImage = 'url(' + st.imgs[mid] + ')'; el.textContent = ''; }).catch(function () { st.imgs[mid] = false; el.textContent = 'sem foto'; });
    });
  }
  function carregar() {
    var b = document.getElementById('feqBody'); if (b && !st.d) b.innerHTML = '<div class="feq-vazio">Carregando as fotos…</div>';
    return api('/bot/fotos/decisoes?dias=7').then(function (d) { st.d = d; desenhar(); marcarSec(); }).catch(function (e) { if (b) b.innerHTML = '<div class="feq-p">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function acao(corpo, ok) { return api('/bot/fotos/acao', corpo).then(function () { aviso(ok); st.ed = null; return carregar(); }).catch(function (e) { aviso('⚠️ ' + e.message); }); }
  function abrir() {
    css(); var v = document.getElementById('hrFeq'); if (v) v.remove(); st.ed = null;
    var d = document.createElement('div'); d.id = 'hrFeq';
    d.innerHTML = '<div class="feq-top"><button class="feq-ic" data-a="sair">←</button><div style="flex:1;"><b>📸 Fotos da equipe</b><div class="feq-sub" id="feqSub">Carregando…</div></div><button class="feq-ic" data-a="rec">⟳</button></div>'
      + '<div class="feq-tabs"><button data-aba="conf" class="on">Para conferir</button><button data-aba="todas">Todas (7 dias)</button></div><div class="feq-body" id="feqBody"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var t = function (s) { return e.target.closest(s); }, el;
      if ((el = t('[data-a]'))) { if (el.getAttribute('data-a') === 'sair') d.remove(); else carregar(); return; }
      if ((el = t('[data-aba]'))) { st.aba = el.getAttribute('data-aba'); st.ed = null; desenhar(); return; }
      if ((el = t('.feq-th'))) { var mid = el.getAttribute('data-mid'); if (st.imgs[mid]) { var z = document.createElement('div'); z.className = 'feq-zoom'; z.innerHTML = '<img src="' + st.imgs[mid] + '">'; z.onclick = function () { z.remove(); }; document.body.appendChild(z); } return; }
      if ((el = t('[data-ok]'))) { el.disabled = true; acao({ id: +el.getAttribute('data-ok'), acao: 'ok' }, '✅ Conferida'); return; }
      if ((el = t('[data-edit]'))) { st.ed = 'd' + el.getAttribute('data-edit'); desenhar(); return; }
      if ((el = t('[data-cancela]'))) { st.ed = null; desenhar(); return; }
      if ((el = t('[data-desf]'))) { if (!confirm('Desfazer o que a Helena registrou com essa foto? O funcionário é avisado.')) return; el.disabled = true; acao({ id: +el.getAttribute('data-desf'), acao: 'desfazer' }, '↩️ Desfeito'); return; }
      if ((el = t('[data-salvar]')) || (el = t('[data-pend]'))) {
        var card = el.closest('.feq-card'), pid = card.querySelector('[data-k="pid"]').value, et = card.querySelector('[data-k="et"]').value;
        if (!pid || !et) { aviso('Escolha o cliente e o que foi feito.'); return; }
        el.disabled = true;
        if (el.hasAttribute('data-salvar')) acao({ id: +el.getAttribute('data-salvar'), acao: 'mudar', pid: pid, etapa: et }, '✅ Corrigido — a Helena aprendeu');
        else acao({ pend: el.getAttribute('data-pend'), pid: pid, etapa: et }, '✅ Registrado');
      }
    });
    carregar();
  }
  function marcarSec() { var n = st.d ? st.d.decisoes.filter(precisaConferir).length + st.d.pendentes.length : 0, el = document.querySelector('[data-feq-btn] .n'); if (el) { el.textContent = n; el.style.display = n ? '' : 'none'; } }
  function cartaoSec() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-feq-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'feq-card-sec'; b.setAttribute('data-feq-btn', '1');
    b.innerHTML = '<span class="ic">📸</span><div style="flex:1;"><div class="t">Fotos da equipe</div><div class="s">O que a Helena entendeu de cada foto (cliente e etapa) — confira, corrija ou desfaça</div></div><span class="n" style="display:none"></span><span style="color:#60a5fa;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-prd-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.appendChild(b);
    if (base()) api('/bot/fotos/decisoes?dias=2').then(function (d) { st.d = d; marcarSec(); }).catch(function () {});
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartaoSec(); new MutationObserver(cartaoSec).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirFotosEquipe = abrir;
})();
