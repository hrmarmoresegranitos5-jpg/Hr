// app-pdf-bot.js — v1: botão "🤖 Enviar pelo bot" na tela do PDF do orçamento.
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

  function codDe(q) { try { var c = (JSON.parse(localStorage.getItem('hr_clientes') || '[]')).find(function (x) { return typeof _cliNorm === 'function' && _cliNorm(x.nome) === _cliNorm(q.cli); }); return (c && c.cod) || ''; } catch (e) { return ''; } }
  // v2: todo PDF de orçamento gerado no app fica guardado no bot (ele manda depois, sem o app aberto)
  var guardadoEm = 0;
  setInterval(function () {
    var u = window._ultimoPdf; if (!u || !u.blob || u.em <= guardadoEm || !base()) return;
    guardadoEm = u.em;
    var q = u.q || {}; if (!(u.num || q.orcNum || q.id) || u.blob.size > 6 * 1024 * 1024) return;
    b64(u.blob).then(function (pdf) {
      return fetch(base() + '/bot/orcpdf/guardar', { method: 'POST', headers: _botHeaders(), body: JSON.stringify({ qId: q.id || '', orcNum: u.num || q.orcNum || '', cliente: q.cli || '', cliCod: codDe(q), tel: telDe(q), valor: q._vistaCalc != null ? q._vistaCalc : (q.vista || q.parc || 0), pedido: pedidoDe(q), arquivo: u.nome, pdf: pdf }) });
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
        return fetch(base() + '/bot/orcamento/enviar', { method: 'POST', headers: _botHeaders(), body: JSON.stringify({ tel: tel, nome: q.cli || '', pdf: pdf, arquivo: u.nome, valor: valor, pedido: pedido, qId: q.id || '', orcNum: u.num || q.orcNum || '', cliCod: codDe(q) }) }).then(function (r) { return r.json(); });
      }).then(function (j) {
        if (j && j.ok) { b.innerHTML = '✓ Enviado'; aviso('🤖 ' + String(j.texto || 'Orçamento enviado pelo bot.').slice(0, 220)); if (q && !q.tel) { try { q.tel = tel; if (typeof DB !== 'undefined' && DB.sv) DB.sv(); } catch (e) {} } }
        else { b.disabled = false; b.innerHTML = '🤖 Enviar pelo bot'; aviso('⚠️ ' + ((j && (j.erro || j.error)) || 'Não deu para enviar.')); }
      }).catch(function (e) { b.disabled = false; b.innerHTML = '🤖 Enviar pelo bot'; aviso('⚠️ ' + e.message); });
    };
  }
  new MutationObserver(function () { var s = document.getElementById('pdfBtnShare') || document.getElementById('pdfBtnDown'); if (s && !document.getElementById('pdfBtnBot')) botao(s); }).observe(document.body, { childList: true, subtree: true });
})();
