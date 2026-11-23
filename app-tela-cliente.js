// app-tela-cliente.js — v3 (23/11/2026)
// TELA DO CLIENTE: enquanto o Sr. Hangel monta o orçamento, a TV (PC no HDMI) ou o tablet mostram ao cliente,
// ao vivo: pedra, peças, acabamentos por lado (sainha, frontão…), cuba, serviços e os VALORES calculados.
// Nunca vai para a tela: custo, lucro, margem, perda, "Conferência interna" — só o que já é do cliente
// (o mesmo "Resultado" que vira o PDF). Liga/desliga no 📺 do topo do Orçamento.
(function () {
  var LS = 'hr_tela_cli_on', ultimo = '', ultEnvio = 0, enviando = false;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function ligado() { try { return localStorage.getItem(LS) === '1'; } catch (e) { return false; } }
  function setLig(v) { try { localStorage.setItem(LS, v ? '1' : '0'); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function svLabel(tipo, k) {
    try { var gs = (window.SV_DEFS || SV_DEFS)[tipo] || []; for (var i = 0; i < gs.length; i++) for (var j = 0; j < gs[i].its.length; j++) if (gs[i].its[j].k === k) return gs[i].its[j].l; } catch (e) {}
    try { var s = (CFG.svList || []).find(function (x) { return x.k === k; }); if (s) return s.l || s.nm || ''; } catch (e) {}
    return '';
  }
  var LADOS = { fr: 'Frente', fd: 'Fundo', esq: 'Esquerda', dir: 'Direita' };
  var TIPOS = { sainha: 'Sainha', frontao: 'Frontão', acabamento: 'Acabamento', recorte45: 'Recorte 45°' };
  function dados() {
    var g = function (id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; };
    var ambs = (window.ambientes || (typeof ambientes !== 'undefined' ? ambientes : [])).map(function (a) {
      var st = null; try { st = (CFG.stones || []).find(function (x) { return x.id === (a.selMat || window.selMat); }); } catch (e) {}
      var pecas = (a.pecas || []).filter(function (p) { return +p.w > 0 && +p.h > 0; }).map(function (p) {
        var bd = []; Object.keys(p.bordas || {}).forEach(function (l) { var b = p.bordas[l]; if (!b || !b.tipo) return;
          var sub = b.sub ? svLabel(a.tipo, b.sub) : ''; var t = (sub && b.tipo !== 'acabamento' ? sub : TIPOS[b.tipo] || b.tipo) + (b.alt && b.tipo !== 'acabamento' ? ' ' + b.alt + ' cm' : '');
          bd.push({ l: LADOS[l] || l, t: t }); });
        return { desc: p.desc || 'Peça', w: Math.round(+p.w), h: Math.round(+p.h), q: +p.q || 1, bd: bd };
      });
      var ext = []; Object.keys(a.svState || {}).forEach(function (k) { if (/^cuba_/.test(k)) return; var v = a.svState[k]; if (!v) return; var l = svLabel(a.tipo, k); if (!l || /^(Sainha|Frontão)/.test(l)) return; var q = +(v.q || v.qtd || 0); ext.push(l + (q > 1 ? ' (' + q + ')' : '')); });
      Object.keys(a.acState || {}).forEach(function (k) { var v = a.acState[k]; if (!v) return; var n = v.nm || v.l || ''; if (n) ext.push(n + (+v.q > 1 ? ' (' + v.q + ')' : '')); });
      var foto = ''; try { var ph = st && (st.photo || st.foto) || ''; if (/^https?:/.test(ph) && ph.length < 800) foto = ph; else if (/^data:image/.test(ph) && ph.length < 120000) foto = ph; } catch (e) {}
      var cor = ''; try { cor = st ? (typeof _orcStoneColor === 'function' ? _orcStoneColor(st) : (st.cor || '')) : ''; } catch (e) {}
      return { tipo: a.tipo || 'Ambiente', pedra: st ? st.nm : '', pedraFin: st && st.fin ? 'Acabamento ' + String(st.fin).toLowerCase() : '', pedraCat: st ? st.cat || '' : '', pedraDesc: st ? st.desc || '' : '', cor: cor, foto: foto,
        pecas: pecas, cuba: a.selCuba ? String(a.selCuba.nm || '') + (+a.selCuba.qtd > 1 ? ' × ' + a.selCuba.qtd : '') : '', ext: ext };
    });
    return { cli: g('oCliente') || 'Cliente', data: new Date().toLocaleDateString('pt-BR'), modo: window._orcModoValor === 'vista' ? 'vista' : 'prazo', ambs: ambs, val: valores() };
  }
  // Lê o "Resultado" (o mesmo do PDF) já calculado: linhas por ambiente, sem custo/lucro/perda
  function num(t) { var m = String(t || '').match(/R\$\s*([\d.]+,\d{2}|[\d.]+)/); if (!m) return 0; var x = m[1]; return x.indexOf(',') >= 0 ? parseFloat(x.replace(/\./g, '').replace(',', '.')) : parseFloat(x); }
  function limpaRot(t) { return String(t || '').replace(/\s*\([^)]*\d[^)]*(ml|m²|cm|×)[^)]*\)/g, '').replace(/^Recorte 45°/, 'Sainha 45°').replace(/^Reto\b/, 'Frontão reto').replace(/\s+/g, ' ').trim(); }
  function valores() {
    var ra = document.getElementById('resArea'), rd = document.getElementById('resDetail');
    if (!ra || !rd || ra.style.display === 'none' || !rd.textContent.trim()) return null;
    var vista = num((document.getElementById('rdVistaVal') || {}).textContent); if (!(vista > 0)) return null;
    var grupos = [], g = null, m2 = 0;
    [].slice.call(rd.children).forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (/^\d+º\s*Ambiente/i.test(tx) && !el.classList.contains('rrow')) { g = { t: tx.replace(/^\d+º\s*Ambiente\s*[—-]\s*/i, ''), ls: [] }; grupos.push(g); return; }
      if (!el.classList.contains('rrow') || /^rd/.test(el.id || '')) return;
      var rk = (el.querySelector('.rk') || {}).textContent || '', rv = (el.querySelector('.rv') || {}).textContent || '';
      if (/(custo|lucro|margem|confer|interno)/i.test(rk)) return;
      if (/^Total m²/i.test(rk)) { m2 = parseFloat(rv.replace(',', '.')) || 0; return; }
      if (/m²\s*$/.test(rv.trim())) return; // peça: só medida
      var v = num(rv); if (!(v > 0)) return;
      if (!g) { g = { t: '', ls: [] }; grupos.push(g); }
      var mp = rk.match(/^(.*?)\s+—\s+([\d.,]+)\s*m²/);
      if (mp) g.ls.push({ k: 'pedra', l: 'Pedra ' + mp[1], s: mp[2].replace('.', ',') + ' m² de pedra', v: v });
      else if (/^M\.?\s?O\.?\s/i.test(rk)) g.ls.push({ k: 'mo', l: rk, v: v });
      else if (/urg[êe]ncia/i.test(rk)) g.ls.push({ k: 'item', l: 'Prioridade na produção', v: v });
      else g.ls.push({ k: 'item', l: limpaRot(rk), v: v });
    });
    grupos = grupos.filter(function (x) { return x.ls.length; });
    return { vista: vista, m2: m2, grupos: grupos };
  }
  function publicar(d, forcar) {
    var b = base(); if (!b || enviando) return; var s = JSON.stringify(d);
    if (!forcar && s === ultimo && Date.now() - ultEnvio < 60000) return;
    enviando = true; ultimo = s; ultEnvio = Date.now();
    fetch(b + '/bot/tela/publicar', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ dados: d }) })
      .catch(function () { ultimo = ''; }).then(function () { enviando = false; });
  }
  function tick() {
    if (!ligado()) return;
    var pg = document.getElementById('pg0'); if (!pg || pg.offsetParent === null) return;
    publicar(dados());
  }
  setInterval(tick, 1500);

  // botão 📺 no topo do Orçamento
  function botao() {
    var nv = document.getElementById('btnNovoOrc'); if (!nv || document.getElementById('btnTelaCli')) return;
    var box = document.createElement('div'); box.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0;';
    nv.parentNode.insertBefore(box, nv); box.appendChild(nv);
    var bt = document.createElement('button'); bt.id = 'btnTelaCli'; bt.type = 'button'; bt.title = 'Mostrar o orçamento ao cliente na TV ou no tablet';
    bt.style.cssText = 'border-radius:10px;padding:9px 11px;font:700 .72rem Outfit,sans-serif;cursor:pointer;white-space:nowrap;';
    box.insertBefore(bt, nv); pintar();
    bt.onclick = function () { if (ligado()) abrirPainel(); else abrirModal(); };
  }
  function pintar() { var bt = document.getElementById('btnTelaCli'); if (!bt) return; var on = ligado();
    bt.textContent = on ? '📺 Ao vivo' : '📺 TV';
    bt.style.background = on ? 'linear-gradient(135deg,#e8c96a,#c9a84c)' : 'rgba(255,255,255,.05)'; bt.style.color = on ? '#1a1408' : '#e8c96a'; bt.style.border = '1px solid rgba(201,168,76,.55)'; }
  setInterval(botao, 1200);

  function abrirModal() {
    var b = base(); if (!b) { toast('⚠️ Configure o bot neste aparelho (Config → Bot) para usar a tela do cliente.'); return; }
    var m = document.createElement('div'); m.id = 'telaCliMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:520px;background:#12100b;border:1px solid rgba(201,168,76,.4);border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));color:#f1ead8;font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:700;color:#e8c96a;margin-bottom:6px;">📺 Tela do cliente</div>' +
      '<div style="font-size:.8rem;color:#bdb19a;line-height:1.5;margin-bottom:12px;">Abra este link no navegador do PC ligado na TV (aperte <b>F11</b> para tela cheia) ou no tablet. O cliente vê a pedra, as peças, os acabamentos e os valores ao vivo. <b>Custo, lucro e a conferência interna nunca aparecem.</b></div>' +
      '<div id="telaCliLink" style="background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.3);border-radius:10px;padding:10px;font-size:.78rem;word-break:break-all;color:#f0d78c;">Gerando o link…</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;"><button id="telaCliCop" style="flex:1;min-height:44px;border-radius:12px;border:1px solid rgba(201,168,76,.5);background:none;color:#f0d78c;font-weight:700;">📋 Copiar link</button>' +
      '<button id="telaCliOn" style="flex:1.3;min-height:44px;border-radius:12px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;">Ligar a tela</button></div>' +
      '<button id="telaCliX" style="width:100%;margin-top:8px;background:none;border:none;color:#8a7f68;padding:8px;">Fechar</button></div>';
    document.body.appendChild(m);
    var link = '';
    fetch(b + '/bot/tela/link', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { link = j.url || ''; document.getElementById('telaCliLink').textContent = link || ('Erro: ' + (j.error || 'sem link')); })
      .catch(function () { document.getElementById('telaCliLink').textContent = 'Não consegui falar com o bot agora.'; });
    m.onclick = function (ev) { if (ev.target === m || ev.target.id === 'telaCliX') m.remove(); };
    document.getElementById('telaCliCop').onclick = function () { if (!link) return; try { navigator.clipboard.writeText(link); toast('Link copiado'); } catch (e) {} };
    document.getElementById('telaCliOn').onclick = function () { setLig(true); pintar(); ultimo = ''; tick(); m.remove(); toast('📺 Tela do cliente ligada'); };
  }
  // Painel da tela ligada: Pix na TV (QR do Mercado Pago gerado pelo bot) e desligar
  function fm2(v) { return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function abrirPainel() {
    var b = base(), val = valores(), vista = val ? val.vista : 0, prazo = Math.round(vista * 1.15 * 100) / 100;
    var m = document.createElement('div'); m.id = 'telaCliPn';
    m.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center;';
    var bt = 'min-height:42px;border-radius:12px;border:1px solid rgba(201,168,76,.45);background:none;color:#f0d78c;font-weight:700;font-family:inherit;';
    m.innerHTML = '<div style="width:100%;max-width:520px;background:#12100b;border:1px solid rgba(201,168,76,.4);border-radius:20px 20px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));color:#f1ead8;font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:700;color:#e8c96a;margin-bottom:4px;">📺 Tela do cliente · ao vivo</div>' +
      '<div style="font-size:.78rem;color:#bdb19a;margin-bottom:14px;">Gere um Pix e o QR code aparece na TV. Quando o cliente pagar, a TV mostra "Pagamento confirmado" e o senhor recebe o aviso.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">' +
      '<button data-v="' + (vista / 2) + '" data-t="Sinal de 50%" style="' + bt + '">Sinal 50%</button>' +
      '<button data-v="' + vista + '" data-t="Pagamento à vista" style="' + bt + '">À vista</button>' +
      '<button data-v="" data-t="Pagamento" style="' + bt + '">Outro valor</button></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><span style="color:#bdb19a;font-size:.85rem;">R$</span><input id="tpxV" inputmode="decimal" placeholder="0,00" style="flex:1;min-height:44px;border-radius:12px;border:1px solid rgba(201,168,76,.4);background:rgba(255,255,255,.05);color:#f1ead8;font-size:1.1rem;padding:0 12px;font-family:inherit;"></div>' +
      '<input id="tpxT" placeholder="Descrição (ex.: Sinal de 50%)" style="width:100%;min-height:40px;border-radius:12px;border:1px solid rgba(201,168,76,.25);background:rgba(255,255,255,.03);color:#f1ead8;padding:0 12px;font-family:inherit;margin-bottom:10px;">' +
      '<button id="tpxGo" style="width:100%;min-height:48px;border-radius:12px;border:none;background:linear-gradient(135deg,#5fd28e,#3aa86a);color:#06140b;font-weight:800;font-size:1rem;font-family:inherit;">💠 Mostrar Pix na TV</button>' +
      '<div id="tpxMsg" style="font-size:.8rem;color:#bdb19a;text-align:center;min-height:18px;margin-top:8px;"></div>' +
      '<div style="font-size:.85rem;font-weight:700;color:#e8c96a;margin:14px 0 6px;">🖼️ Fotos na TV</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">' + ['Cozinhas', 'Banheiros', 'Escadas', 'Túmulos', 'Pedras', 'Trabalhos'].map(function (t) { return '<button data-g="' + t + '" style="' + bt + '">' + t + '</button>'; }).join('') + '</div>' +
      '<button id="tgX" style="width:100%;margin-top:6px;' + bt + '">Tirar as fotos e voltar ao orçamento</button>' +
      '<div id="tgMsg" style="font-size:.78rem;color:#bdb19a;text-align:center;min-height:16px;margin-top:6px;">Também dá para pedir ao bot: "coloca modelos de cozinha na TV".</div>' +
      '<div style="display:flex;gap:8px;margin-top:6px;"><button id="tpxX" style="flex:1;' + bt + '">Tirar o Pix da TV</button><button id="tpxOff" style="flex:1;' + bt + 'color:#ff9a8a;border-color:rgba(255,120,100,.4);">Desligar a tela</button></div>' +
      '<button id="tpxF" style="width:100%;margin-top:8px;background:none;border:none;color:#8a7f68;padding:8px;">Fechar</button></div>';
    document.body.appendChild(m);
    var iv = document.getElementById('tpxV'), it = document.getElementById('tpxT'), msg = document.getElementById('tpxMsg');
    if (vista > 0) { iv.value = fm2(vista / 2); it.value = 'Sinal de 50%'; } else msg.textContent = 'Calcule o orçamento para preencher o sinal e o total.';
    [].slice.call(m.querySelectorAll('button[data-t]')).forEach(function (x) { x.onclick = function () { var v = +x.getAttribute('data-v'); iv.value = v > 0 ? fm2(v) : ''; it.value = x.getAttribute('data-t'); if (!(v > 0)) iv.focus(); }; });
    function post(corpo) { return fetch(b + '/bot/tela/pix', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(corpo) }).then(function (r) { return r.json(); }); }
    m.onclick = function (ev) { if (ev.target === m || ev.target.id === 'tpxF') m.remove(); };
    document.getElementById('tpxGo').onclick = function () {
      var v = parseFloat(String(iv.value).replace(/\./g, '').replace(',', '.'));
      if (!(v >= 1)) { msg.textContent = 'Digite o valor do Pix.'; return; }
      msg.textContent = 'Gerando o Pix…';
      post({ valor: v, tipo: it.value || 'Pagamento', cli: (document.getElementById('oCliente') || {}).value || 'Cliente' }).then(function (j) {
        if (j.error) { msg.textContent = '⚠️ ' + j.error; return; }
        msg.innerHTML = '✅ QR de R$ ' + fm2(j.valor) + ' na TV. Aguardando o pagamento…'; acompanhar();
      }).catch(function () { msg.textContent = 'Não consegui falar com o bot agora.'; });
    };
    function acompanhar() { var n = 0, t = setInterval(function () { if (!document.getElementById('tpxMsg') || ++n > 400) { clearInterval(t); return; }
      post({ estado: 1 }).then(function (j) { if (j.status === 'pago') { clearInterval(t); var el = document.getElementById('tpxMsg'); if (el) el.innerHTML = '<b style="color:#5fd28e">💚 Pago! R$ ' + fm2(j.valor) + ' confirmado.</b>'; try { toast('💚 Pix da TV confirmado'); } catch (e) {} } }).catch(function () {}); }, 4000); }
    function gpost(corpo) { return fetch(b + '/bot/tela/galeria', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(corpo) }).then(function (r) { return r.json(); }); }
    var gm = document.getElementById('tgMsg');
    [].slice.call(m.querySelectorAll('button[data-g]')).forEach(function (x) { x.onclick = function () { gm.textContent = 'Colocando na TV…';
      gpost({ q: x.getAttribute('data-g') === 'Pedras' ? 'pedras' : x.getAttribute('data-g') === 'Trabalhos' ? 'trabalhos' : 'modelos de ' + x.getAttribute('data-g') }).then(function (j) {
        gm.textContent = j.ok ? '✅ ' + j.n + ' fotos na TV: ' + j.titulo : 'Ainda não há fotos de ' + x.getAttribute('data-g').toLowerCase() + '. Mande ao bot com a legenda "tv".'; }).catch(function () { gm.textContent = 'Não consegui falar com o bot.'; }); }; });
    document.getElementById('tgX').onclick = function () { gpost({ cancelar: 1 }).then(function () { gm.textContent = 'A TV voltou ao orçamento.'; }); };
    document.getElementById('tpxX').onclick = function () { post({ cancelar: 1 }).then(function () { msg.textContent = 'Pix retirado da TV.'; }); };
    document.getElementById('tpxOff').onclick = function () { setLig(false); publicar({ off: true }, true); post({ cancelar: 1 }).catch(function () {}); pintar(); m.remove(); toast('📺 Tela do cliente desligada'); };
  }
  window.HRTelaCli = { dados: dados, ligar: function () { setLig(true); pintar(); }, desligar: function () { setLig(false); pintar(); } };
})();
