// app-aprovar.js — v1: ✅ Aprovar produção (dados no bot: /bot/producao/aprovar)
// Tudo o que a equipe manda pelo WhatsApp (corte, acabamento, fabricação, entrega, instalação) fica PENDENTE:
// não conta ponto e não sai entrega a ninguém até o Sr. Hangel aprovar aqui (ou pelos botões do WhatsApp).
(function () {
  'use strict';
  if (window.__hrAprov) return; window.__hrAprov = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function api(corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + '/bot/producao/aprovar', corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || 'Erro ' + r.status); return j; });
    });
  }
  function pt(v) { return v == null ? '' : String(Math.round(v * 10) / 10).replace('.', ','); }
  function quando(ts) { try { var d = new Date(ts); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  var IC = { corte: '✂️', polimento: '✨', acabamento: '🪨', fabricacao: '🔧', entrega: '🚚', instalacao: '🏠', retirada: '📦', finalizado: '🏁' };
  var st = { d: null, aba: 'pend', sel: {} };

  var CSS = '#hrApv{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:apvIn .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrApv *{box-sizing:border-box}@keyframes apvIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'
    + '.apv-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.apv-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.apv-sub{font-size:.72rem;color:#9a917e}'
    + '.apv-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 8px}'
    + '.apv-tabs{display:flex;gap:6px;padding:10px 12px 0}.apv-tabs button{flex:1;padding:9px;border-radius:12px;border:1px solid rgba(201,168,76,.22);background:transparent;color:#c9bfa6;font-weight:700;font-size:.78rem}'
    + '.apv-tabs button.on{background:rgba(201,168,76,.16);color:#f0d78c;border-color:rgba(201,168,76,.5)}'
    + '.apv-body{flex:1;overflow-y:auto;padding:12px 12px 110px}'
    + '.apv-cli{margin:14px 2px 6px;font-weight:800;color:#f0d78c;font-size:.95rem}.apv-cli small{display:block;font-weight:500;color:#9a917e;font-size:.7rem}'
    + '.apv-card{display:flex;gap:10px;align-items:flex-start;border-radius:14px;padding:11px;margin-bottom:8px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07)}'
    + '.apv-card.pend{border-color:rgba(232,165,48,.4)}.apv-card.sel{border-color:rgba(52,211,153,.6);background:rgba(52,211,153,.08)}'
    + '.apv-ck{width:26px;height:26px;flex:none;border-radius:8px;border:2px solid rgba(201,168,76,.45);display:flex;align-items:center;justify-content:center;font-size:.9rem;color:#0a0908;cursor:pointer}'
    + '.apv-card.sel .apv-ck{background:#34d399;border-color:#34d399}'
    + '.apv-i{flex:1;min-width:0}.apv-l1{font-size:.88rem;font-weight:700}.apv-l2{font-size:.72rem;color:#9a917e;margin-top:2px}.apv-dis{font-size:.78rem;font-style:italic;color:#c9bfa6;margin-top:4px;word-break:break-word}'
    + '.apv-pts{flex:none;text-align:right;font-weight:800;color:#f0d78c;font-size:.9rem}.apv-pts small{display:block;font-size:.6rem;color:#9a917e;font-weight:500}'
    + '.apv-bts{display:flex;gap:6px;margin-top:8px}.apv-bts button{flex:1;padding:8px 4px;border-radius:10px;border:1px solid rgba(201,168,76,.25);background:rgba(201,168,76,.08);color:#f0d78c;font-size:.74rem;font-weight:700}'
    + '.apv-bts button.v{background:rgba(52,211,153,.12);border-color:rgba(52,211,153,.35);color:#9ff0c6}.apv-bts button.d{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.3);color:#fca5a5}'
    + '.apv-chip{display:inline-block;font-size:.62rem;padding:2px 7px;border-radius:8px;margin-left:6px}.apv-chip.ok{background:rgba(52,211,153,.15);color:#9ff0c6}.apv-chip.no{background:rgba(248,113,113,.15);color:#fca5a5}'
    + '.apv-bar{position:fixed;left:0;right:0;bottom:0;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:rgba(14,12,9,.97);border-top:1px solid rgba(201,168,76,.2);display:flex;gap:8px}'
    + '.apv-bar button{flex:1;padding:13px;border-radius:14px;font-weight:800;font-size:.86rem;border:none}.apv-bar .ok{background:linear-gradient(135deg,#34d399,#10b981);color:#04130c}.apv-bar .no{background:rgba(248,113,113,.12);color:#fca5a5;border:1px solid rgba(248,113,113,.3)}'
    + '.apv-bar button:disabled{opacity:.4}.apv-vazio{text-align:center;padding:50px 12px;color:#9a917e;font-size:.88rem;line-height:1.5}'
    + '.apv-sw{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 2px 10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);font-size:.76rem;color:#c9bfa6}'
    + '.apv-sw button{padding:6px 10px;border-radius:9px;border:1px solid rgba(201,168,76,.3);background:transparent;color:#f0d78c;font-size:.7rem;font-weight:700}';

  function el(id) { return document.getElementById(id); }
  function fechar() { var r = el('hrApv'); if (r) r.remove(); }
  function pend() { return ((st.d && st.d.itens) || []).filter(function (x) { return x.st === 0; }); }
  function chave(x) { return x.pid + '|' + x.apId; }

  function render() {
    var r = el('hrApv'); if (!r) return;
    var l = st.aba === 'pend' ? pend() : ((st.d && st.d.itens) || []).filter(function (x) { return x.st !== 0; });
    var nSel = Object.keys(st.sel).filter(function (k) { return st.sel[k]; }).length;
    var h = '<div class="apv-top"><button class="apv-ic" data-a="x">←</button><div style="flex:1"><b>Aprovar produção</b><div class="apv-sub">O que a equipe mandou pelo WhatsApp · só conta ponto depois do seu ✅</div></div><button class="apv-ic" data-a="r">↻</button></div>'
      + '<div class="apv-tabs"><button data-t="pend" class="' + (st.aba === 'pend' ? 'on' : '') + '">Esperando (' + pend().length + ')</button><button data-t="feitos" class="' + (st.aba !== 'pend' ? 'on' : '') + '">Decididos</button></div><div class="apv-body">';
    if (!st.d) h += '<div class="apv-vazio">Carregando…</div>';
    else {
      if (st.aba === 'pend') h += '<div class="apv-sw"><span>' + (st.d.ativo ? '🔒 Aprovação <b>ligada</b>: nada da equipe conta sem você.' : '🔓 Aprovação <b>desligada</b>: a equipe conta ponto direto.') + '</span><button data-a="sw">' + (st.d.ativo ? 'Desligar' : 'Ligar') + '</button></div>';
      if (!l.length) h += '<div class="apv-vazio">' + (st.aba === 'pend' ? '✅ Nada esperando aprovação.<br>Quando alguém da equipe avisar que fez uma etapa, ela aparece aqui.' : 'Nenhuma decisão nos últimos dias.') + '</div>';
      var grupo = {}; l.forEach(function (x) { (grupo[x.pid] = grupo[x.pid] || []).push(x); });
      Object.keys(grupo).forEach(function (pid) {
        var g = grupo[pid], a = g[0];
        h += '<div class="apv-cli">' + esc(a.cliente) + '<small>' + esc(a.resumo || '') + (a.pedra && String(a.resumo || '').indexOf(a.pedra) < 0 ? ' · ' + esc(a.pedra) : '') + '</small></div>';
        g.forEach(function (x) {
          var k = chave(x), sel = !!st.sel[k], p0 = x.st === 0;
          h += '<div class="apv-card ' + (p0 ? 'pend' : '') + (sel ? ' sel' : '') + '" data-k="' + esc(k) + '">'
            + (p0 ? '<div class="apv-ck" data-a="ck" data-k="' + esc(k) + '">' + (sel ? '✓' : '') + '</div>' : '')
            + '<div class="apv-i"><div class="apv-l1">' + (IC[x.etapa] || '•') + ' ' + esc((x.quem || []).join(' e ')) + ' · ' + esc(x.etapaTxt || x.etapa)
            + (!p0 ? '<span class="apv-chip ' + (x.st === 1 ? 'ok' : 'no') + '">' + (x.st === 1 ? 'aprovado' : 'não aprovado') + '</span>' : '') + '</div>'
            + '<div class="apv-l2">' + esc(String(x.itens || '').split(' · ').slice(1, -1).join(' · ') || '') + ' ' + quando(x.ts) + '</div>'
            + (x.disse ? '<div class="apv-dis">"' + esc(x.disse) + '"</div>' : '')
            + (p0 ? '<div class="apv-bts"><button class="v" data-a="ok1" data-k="' + esc(k) + '">✅ Aprovar</button><button class="d" data-a="no1" data-k="' + esc(k) + '">❌ Não foi isso</button></div>' : '')
            + '</div>' + (x.pts != null ? '<div class="apv-pts">' + pt(x.pts) + '<small>pontos</small></div>' : '') + '</div>';
        });
      });
    }
    h += '</div>';
    if (st.d && st.aba === 'pend' && pend().length) h += '<div class="apv-bar"><button class="no" data-a="nosel"' + (nSel ? '' : ' disabled') + '>❌ Recusar (' + nSel + ')</button><button class="ok" data-a="oksel">' + (nSel ? '✅ Aprovar ' + nSel : '✅ Aprovar todos (' + pend().length + ')') + '</button></div>';
    r.innerHTML = h;
  }

  function carregar() { return api().then(function (j) { st.d = j; st.sel = {}; render(); atualizarBadge(); }).catch(function (e) { st.d = { itens: [], ativo: true }; render(); aviso(e.message); }); }
  function decidir(lista) {
    if (!lista.length) return;
    return api({ itens: lista }).then(function (j) { aviso((j.aprovados ? '✅ ' + j.aprovados + ' aprovado(s). ' : '') + (j.recusados ? '❌ ' + j.recusados + ' recusado(s).' : '')); return carregar(); }).catch(function (e) { aviso(e.message); });
  }
  function itemDe(k) { return pend().filter(function (x) { return chave(x) === k; })[0]; }

  function abrir() {
    if (!el('apvCss')) { var s = document.createElement('style'); s.id = 'apvCss'; s.textContent = CSS; document.head.appendChild(s); }
    fechar(); var r = document.createElement('div'); r.id = 'hrApv'; document.body.appendChild(r);
    st.d = null; st.aba = 'pend'; render();
    r.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-a],[data-t]'); if (!t) return;
      if (t.getAttribute('data-t')) { st.aba = t.getAttribute('data-t'); render(); return; }
      var a = t.getAttribute('data-a'), k = t.getAttribute('data-k');
      if (a === 'x') return fechar();
      if (a === 'r') { st.d = null; render(); return carregar(); }
      if (a === 'ck') { st.sel[k] = !st.sel[k]; return render(); }
      if (a === 'ok1' || a === 'no1') { var x = itemDe(k); if (x) decidir([{ pid: x.pid, apId: x.apId, ok: a === 'ok1' }]); return; }
      if (a === 'oksel' || a === 'nosel') {
        var ks = Object.keys(st.sel).filter(function (q) { return st.sel[q]; }); var ok = a === 'oksel';
        var l = (ks.length ? ks.map(itemDe).filter(Boolean) : (ok ? pend() : []));
        if (!l.length) return;
        if (!ok && !confirm('Recusar ' + l.length + ' registro(s)? Não contam ponto e o funcionário é avisado.')) return;
        if (ok && !ks.length && !confirm('Aprovar todos os ' + l.length + ' registros?')) return;
        return decidir(l.map(function (x) { return { pid: x.pid, apId: x.apId, ok: ok }; }));
      }
      if (a === 'sw') { var on = !(st.d && st.d.ativo); if (!on && !confirm('Desligar a aprovação? O que a equipe mandar volta a contar ponto e a enviar entrega sozinho.')) return; api({ ativo: on }).then(carregar).catch(function (e) { aviso(e.message); }); }
    });
    carregar();
  }
  // número de pendentes no botão da tela de Produção (se existir)
  function atualizarBadge() { try { var n = pend().length; document.querySelectorAll('[data-apv-n]').forEach(function (b) { b.textContent = n ? String(n) : ''; b.style.display = n ? '' : 'none'; }); } catch (e) {} }
  window.abrirAprovarProducao = abrir;
})();
