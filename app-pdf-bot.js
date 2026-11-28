// app-pdf-bot.js — v6: todas as pedras no link. v5: três opções de pedra no link. v4: manda também os dados da página do orçamento (link /o/nome). v3: manda também as peças (ficha de corte). v1: botão "🤖 Enviar pelo bot" na tela do PDF do orçamento.
// O bot manda o PDF ao cliente pelo WhatsApp da HR (dentro ou fora das 24 h, com o modelo aprovado da Meta),
// registra o orçamento para o acompanhamento automático (parados, retomada, cliente quente) e a assistente
// passa a saber o valor e o que foi orçado quando o cliente responder. Usa window._ultimoPdf (app-core.js).
(function () {
  if (window.__hrPdfBot) return; window.__hrPdfBot = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function aviso(t) { try { if (typeof toast === 'function') return toast(t); } catch (e) {} alert(t); }
  function b64(blob) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = erro; r.readAsDataURL(blob); }); }
  function pedidoDe(q) { return [String(q.tipo || '').replace(/\+/g, ' + '), q.mat].filter(Boolean).join(' em ').slice(0, 80); }
  function telDe(q) { var t = String((q && q.tel) || '').replace(/\D/g, ''); if (!t && q && q.cli) { try { var c = (JSON.parse(localStorage.getItem('hr_clientes') || '[]')).find(function (x) { return typeof _cliNorm === 'function' ? _cliNorm(x.nome) === _cliNorm(q.cli) : x.nome === q.cli; }); if (c && c.tel) t = String(c.tel).replace(/\D/g, ''); } catch (e) {} } return t; }

  // v3: pedra e peças do orçamento (para a ficha de corte que o bot manda ao Fabrício quando o dono fecha)
  var ACB_DE = { sol_sem: 'sem', sol1: '1_lado', sol2: '2_lados', sol_45: '45', peit_sem: 'sem', peit_acb1: '1_lado', peit_acb2: '2_lados' };
  function resumoDe(q) {
    try {
      var itens = (q.ambSnap || []).map(function (a) {
        var acb = ''; Object.keys(a.svState || {}).forEach(function (k) { if (ACB_DE[k]) acb = ACB_DE[k]; });
        var ci = ''; [a, a.selCuba || {}].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { var v = o[k]; if (typeof v === 'string' && /^(sobrepor|embutir|embutida|flush)$/i.test(v)) ci = v.toLowerCase(); }); }); // v5: tipo de instalação da cuba
        return { ambiente: String(a.tipo || ''), acabamento: acb, sv: Object.keys(a.svState || {}), cuba: a.selCuba ? String(a.selCuba.id || '') : '', cubaInst: ci, pecas: (a.pecas || []).map(function (p) { var rot = ''; ['n', 'nome', 'label', 'desc', 'tipo', 't', 'obs'].forEach(function (k) { if (!rot && typeof p[k] === 'string' && p[k].trim() && p[k].length < 40) rot = p[k].trim(); }); return { qtd: +p.q || 1, comp_cm: +p.w || 0, larg_cm: +p.h || 0, rot: rot }; }).filter(function (p) { return p.comp_cm > 0 && p.larg_cm > 0; }) };
      }).filter(function (it) { return it.pecas.length; });
      return itens.length ? { pedra: q.mat || '', itens: itens } : null;
    } catch (e) { return null; }
  }


  // v6: todas as pedras do catálogo no link (mesma obra, só troca a pedra), da mais em conta à mais nobre
  function opcoesDe(q) {
    try {
      if (!(q.m2 > 0) || q.tum || (CFG.emp && CFG.emp.link3op === false)) return [];
      var pedras = {}; (q.ambSnap || []).forEach(function (a) { if (a.selMat) pedras[a.selMat] = 1; }); if (Object.keys(pedras).length > 1) return [];
      var st = CFG.stones || [], mat = st.find(function (x) { return x.nm === q.mat; }); if (!mat || !(mat.pr > 0)) return [];
      var urg = 1 + (+q.urgPct || 0) / 100, base = +q._vistaCalc || +q.vista || 0, fv = base ? (+q.vista || base) / base : 1, fp = base ? (+q.parc || base * 1.15) / base : 1.15;
      var custo = function (x) { return (+q.m2) * (1 + ((x.perda != null ? +x.perda : 10) / 100)) * x.pr; };
      var L = st.filter(function (x) { return x && x.pr > 0 && x.nm && !/cliente|instala/i.test(x.nm) && x.oculto !== true && x.ativo !== false; }).map(function (x) {
        if (x.id === mat.id) return { nm: String(x.nm).slice(0, 60), fin: String(x.fin || '').slice(0, 30), tag: String(x.cat || '').slice(0, 24), atual: true, vista: +q.vista || 0, parc: +q.parc || 0 };
        var d = (custo(x) - custo(mat)) * urg; return { nm: String(x.nm).slice(0, 60), fin: String(x.fin || '').slice(0, 30), tag: String(x.cat || '').slice(0, 24), vista: Math.round((+q.vista + d * fv) * 100) / 100, parc: Math.round((+q.parc + d * fp) * 100) / 100 };
      }).filter(function (o) { return o.parc > 0; }).sort(function (a, b) { return a.parc - b.parc; });
      if (L.length < 2) return [];
      return L;
    } catch (e) { return []; }
  }
  // v4: dados da página do orçamento que o cliente abre pelo link (sem custos, sem preço por item)
  function linkDe(q) {
    try {
      var snaps = q.ambSnap || [], amb = snaps.map(function (s) {
        var t = String(s.tipo || ''), defs = (typeof SV_DEFS !== 'undefined' && SV_DEFS[s.tipo]) || [], sv = [];
        Object.keys(s.svState || {}).forEach(function (k) { var l = ''; defs.forEach(function (g) { (g.its || []).forEach(function (it) { if (it.k === k) l = it.l; }); }); if (l) sv.push(String(l).replace(/\s*\(.*?\)\s*$/, '').slice(0, 50)); });
        var pc = (q.pds || []).filter(function (p) { return String(p.desc || '').indexOf(t + ': ') === 0 || snaps.length === 1; }).map(function (p) { return { d: String(p.desc || 'Peça').replace(t + ': ', '').slice(0, 40), w: +p.w || 0, h: +p.h || 0, q: +p.q || 1 }; }).filter(function (p) { return p.w > 0 && p.h > 0; }).slice(0, 30);
        var cb = s.selCuba ? String(s.selCuba.nm || s.selCuba.nome || '').slice(0, 50) : '';
        return { t: t.replace(/^[^A-Za-zÀ-ú]+/, '').slice(0, 30), sv: sv.slice(0, 15), pc: pc, cuba: cb };
      });
      var inc = []; try { if (typeof _pdfInclusos === 'function') inc = _pdfInclusos(q); } catch (e) {}
      var fin = ''; try { var st = (CFG.stones || []).find(function (x) { return x.nm === q.mat; }); fin = st ? String(st.fin || '') : ''; } catch (e) {}
      var ate = ''; try { ate = typeof _orcValidoAte === 'function' ? (_orcValidoAte(q) || '') : ''; } catch (e) {}
      return { vista: +q.vista || 0, parc: +q.parc || 0, mostrarVista: q.mostrarVista !== false, m2: +q.m2 || 0, pedra: String(q.mat || '').slice(0, 60), fin: fin.slice(0, 30), data: q.date || '', ate: String(ate).slice(0, 10), amb: amb.slice(0, 8), inc: inc.slice(0, 16).map(function (x) { return String(x).slice(0, 90); }), cidade: String(q.cidade || '').slice(0, 40), ops: opcoesDe(q) };
    } catch (e) { return null; }
  }
  function codDe(q) { try { var c = (JSON.parse(localStorage.getItem('hr_clientes') || '[]')).find(function (x) { return typeof _cliNorm === 'function' && _cliNorm(x.nome) === _cliNorm(q.cli); }); return (c && c.cod) || ''; } catch (e) { return ''; } }
  // v2: todo PDF de orçamento gerado no app fica guardado no bot (ele manda depois, sem o app aberto)
  var guardadoEm = 0;
  setInterval(function () {
    var u = window._ultimoPdf; if (!u || !u.blob || u.em <= guardadoEm || !base()) return;
    guardadoEm = u.em;
    var q = u.q || {}; if (!(u.num || q.orcNum || q.id) || u.blob.size > 6 * 1024 * 1024) return;
    b64(u.blob).then(function (pdf) {
      return fetch(base() + '/bot/orcpdf/guardar', { method: 'POST', headers: _botHeaders(), body: JSON.stringify({ qId: q.id || '', orcNum: u.num || q.orcNum || '', cliente: q.cli || '', cliCod: codDe(q), tel: telDe(q), valor: q._vistaCalc != null ? q._vistaCalc : (q.vista || q.parc || 0), pedido: pedidoDe(q), arquivo: u.nome, resumo: resumoDe(q), link: linkDe(q), pdf: pdf }) });
    }).catch(function () {});
  }, 3000);

  function botao(share) {
    if (document.getElementById('pdfBtnBot') || !base()) return;
    var t0 = Date.now() - 1500, b = document.createElement('button'); b.id = 'pdfBtnBot'; b.disabled = true;
    b.style.cssText = 'background:#0f2a1a;border:1px solid rgba(93,191,122,.45);color:#7fdc9c;padding:7px 12px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;opacity:.5;';
    b.innerHTML = '🤖 Enviar pelo bot';
    share.parentNode.insertBefore(b, share.nextSibling);
    var espera = setInterval(function () { if (!document.body.contains(b)) { clearInterval(espera); return; } var u = window._ultimoPdf; if (u && u.em >= t0) { b.disabled = false; b.style.opacity = '1'; clearInterval(espera); } }, 400);
    b.onclick = function () {
      var u = window._ultimoPdf; if (!u || u.em < t0) return aviso('O PDF ainda não ficou pronto.');
      var q = u.q || {}, tel = telDe(q);
      tel = prompt('WhatsApp de ' + (q.cli || 'o cliente') + ' (com DDD):', tel ? tel.replace(/^55/, '') : '');
      if (tel == null) return; tel = tel.replace(/\D/g, ''); if (tel.length < 10) return aviso('Número incompleto: use DDD + número.');
      var valor = q._vistaCalc != null ? q._vistaCalc : (q.vista || q.parc || 0), pedido = pedidoDe(q);
      if (!confirm('Mandar o orçamento ' + (u.num || '') + ' para ' + (q.cli || 'o cliente') + ' pelo WhatsApp da HR?\n\nO bot acompanha sozinho: se o cliente sumir, aparece em "orçamentos parados" para retomar.')) return;
      b.disabled = true; b.innerHTML = '⏳ Enviando…';
      b64(u.blob).then(function (pdf) {
        return fetch(base() + '/bot/orcamento/enviar', { method: 'POST', headers: _botHeaders(), body: JSON.stringify({ tel: tel, nome: q.cli || '', pdf: pdf, arquivo: u.nome, valor: valor, pedido: pedido, qId: q.id || '', orcNum: u.num || q.orcNum || '', cliCod: codDe(q), link: linkDe(q) }) }).then(function (r) { return r.json(); });
      }).then(function (j) {
        if (j && j.ok) { b.innerHTML = '✓ Enviado'; if (j.link) { try { navigator.clipboard.writeText(j.link); } catch (e) {} } aviso('🤖 ' + String(j.texto || 'Orçamento enviado pelo bot.').slice(0, 220)); if (q && !q.tel) { try { q.tel = tel; if (typeof DB !== 'undefined' && DB.sv) DB.sv(); } catch (e) {} } }
        else { b.disabled = false; b.innerHTML = '🤖 Enviar pelo bot'; aviso('⚠️ ' + ((j && (j.erro || j.error)) || 'Não deu para enviar.')); }
      }).catch(function (e) { b.disabled = false; b.innerHTML = '🤖 Enviar pelo bot'; aviso('⚠️ ' + e.message); });
    };
  }
  new MutationObserver(function () { var s = document.getElementById('pdfBtnShare') || document.getElementById('pdfBtnDown'); if (s && !document.getElementById('pdfBtnBot')) botao(s); }).observe(document.body, { childList: true, subtree: true });
})();
