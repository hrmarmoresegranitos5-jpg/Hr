// app-gastos.js — v3 (28/11/2026): teto de gastos por mês. v1 (27/11/2026): GASTOS DA HELENA E DO WHATSAPP
// Cartão nas Configurações: mostra quanto a IA (OpenAI/Claude) e os modelos pagos do WhatsApp estão custando
// (estimativa anotada pelo próprio bot) e liga/desliga o modo economia.
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function aviso(t) { try { toast(t); } catch (e) { alert(t); } }
  function wa(t) { // *negrito* e _itálico_ do WhatsApp em HTML
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>');
  }
  function abrir() {
    var b = base(); if (!b) { aviso('Bot não configurado no app.'); return; }
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,6,9,.96);color:#efe9dc;font-family:Outfit,sans-serif;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto';
    ov.innerHTML = '<div style="max-width:520px;width:100%;background:#14141a;border:1px solid rgba(201,168,76,.3);border-radius:16px;padding:18px">' +
      '<div style="font-family:Cormorant Garamond,serif;color:#ecd27c;font-size:1.6rem">💸 Gastos da Helena</div>' +
      '<div style="color:#a99c80;font-size:.78rem;margin:4px 0 12px">IA (OpenAI e Claude) e mensagens pagas do WhatsApp. Estimativa pelos preços públicos; a fatura real vem de cada empresa.</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:10px">' +
      ['7', '30'].map(function (d) { return '<button data-d="' + d + '" class="gsD" style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#efe9dc;font-weight:700">' + d + ' dias</button>'; }).join('') + '</div>' +
      '<div id="gsTx" style="font-size:.84rem;line-height:1.55;background:#0b0b0e;border-radius:12px;padding:12px;min-height:80px">Carregando…</div>' +
      '<div id="gsTt" style="margin:12px 0 0;background:#0b0b0e;border:1px solid rgba(201,168,76,.18);border-radius:12px;padding:12px"></div>' +
      '<div id="gsEc" style="margin:12px 0;font-size:.84rem"></div>' +
      '<div style="font-size:.72rem;color:#a99c80;margin-bottom:12px">Modo economia: não manda mensagens de marketing/pesquisa pagas, usa voz e transcrição econômicas, faz as auditorias só aos sábados e o vídeo narrado só quando o senhor pede. No WhatsApp: <b>gastos</b>, <b>economia ligada</b>, <b>economia desligada</b>.</div>' +
      '<button id="gsFec" style="width:100%;padding:11px;border:none;border-radius:10px;background:rgba(255,255,255,.08);color:#efe9dc;font-weight:700">Fechar</button></div>';
    document.body.appendChild(ov);
    var tx = ov.querySelector('#gsTx'), ec = ov.querySelector('#gsEc'), tt = ov.querySelector('#gsTt');
    function fmt(n) { return (+n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function teto(t) {
      t = t || { valor: 0, gasto: 0, pct: 0 }; var on = t.valor > 0, pc = Math.min(100, t.pct || 0), cor = t.estourou ? '#e05151' : pc >= 80 ? '#e0a050' : '#5dbf7a';
      tt.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="color:#ecd27c">Teto por mês</b><span style="font-size:.78rem;color:#a99c80">' + (on ? 'R$ ' + fmt(t.gasto) + ' de R$ ' + fmt(t.valor) : 'sem teto · este mês R$ ' + fmt(t.gasto)) + '</span></div>' +
        (on ? '<div style="height:10px;border-radius:99px;background:rgba(255,255,255,.08);margin:10px 0 6px;overflow:hidden"><div style="height:100%;width:' + pc + '%;background:' + cor + ';border-radius:99px"></div></div><div style="font-size:.74rem;color:' + cor + '">' + (t.estourou ? 'Passou do teto: até o mês virar, clientes recebem resposta só em texto e nada pago sai.' : t.pct + '% usado · aviso no WhatsApp aos 80%') + '</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:10px"><input id="gsTv" inputmode="numeric" placeholder="Ex.: 60" value="' + (on ? t.valor : '') + '" style="flex:1;min-width:0;padding:9px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#14141a;color:#efe9dc;font:600 .9rem Outfit,sans-serif">' +
        '<button id="gsTs" style="padding:9px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:700">Salvar</button></div>' +
        '<div style="font-size:.7rem;color:#a99c80;margin-top:6px">Deixe vazio ou 0 para não ter teto. No WhatsApp: <b>teto 60</b>.</div>';
      tt.querySelector('#gsTs').onclick = function () {
        var v = parseInt(String(tt.querySelector('#gsTv').value || '0').replace(/\D/g, ''), 10) || 0;
        fetch(b + '/bot/teto', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ valor: v }) })
          .then(function (r) { return r.json(); }).then(function (j) { teto(j.teto); aviso(v ? 'Teto salvo: R$ ' + v + ' por mês' : 'Sem teto de gastos'); })
          .catch(function (e) { aviso('Não consegui: ' + e.message); });
      };
    }
    function botaoEc(on) {
      ec.innerHTML = 'Modo economia: <b style="color:' + (on ? '#5dbf7a' : '#e0a050') + '">' + (on ? 'ligado' : 'desligado') + '</b> ' +
        '<button id="gsTg" style="margin-left:8px;padding:7px 12px;border:none;border-radius:9px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:700">' + (on ? 'Desligar' : 'Ligar') + '</button>';
      ec.querySelector('#gsTg').onclick = function () {
        fetch(b + '/bot/economia', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ on: !on }) })
          .then(function (r) { return r.json(); }).then(function (j) { botaoEc(!!j.economia); aviso(j.economia ? 'Economia ligada' : 'Economia desligada'); })
          .catch(function (e) { aviso('Não consegui: ' + e.message); });
      };
    }
    function carregar(d) {
      tx.textContent = 'Carregando…';
      fetch(b + '/bot/custos?dias=' + d, { headers: hdr() }).then(function (r) { return r.json(); })
        .then(function (j) { tx.innerHTML = wa(j.texto || j.error || 'Sem dados.'); botaoEc(j.economia !== false); teto(j.teto); })
        .catch(function (e) { tx.textContent = 'Não consegui carregar: ' + e.message; });
    }
    [].forEach.call(ov.querySelectorAll('.gsD'), function (x) { x.onclick = function () { carregar(x.getAttribute('data-d')); }; });
    ov.querySelector('#gsFec').onclick = function () { ov.remove(); };
    carregar(30);
  }
  window.abrirGastosHelena = abrir;
  function cartao() {
    var cb = document.getElementById('cfgBody'); if (!cb || cb.querySelector('.gs-card')) return;
    var d = document.createElement('div'); d.className = 'vz-card gs-card';
    d.innerHTML = '<span style="font-size:1.5rem">💸</span><span><b>Gastos da Helena</b><small>Quanto a IA e o WhatsApp estão custando · teto por mês · modo economia</small></span>';
    d.onclick = abrir; var v = cb.querySelector('.vz-card'); cb.insertBefore(d, v ? v.nextSibling : cb.firstChild);
  }
  setInterval(cartao, 1000);
})();

// v2: aviso vermelho quando a Meta está recusando os envios da Helena (ex.: pagamento recusado) — o dono não recebe nada pelo WhatsApp
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function checar() {
    var b = base(); if (!b) return;
    fetch(b + '/bot/status', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (d) {
      var el = document.getElementById('waFalhaBar'), f = d && d.waFalha;
      if (!f) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'waFalhaBar'; el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99998;background:#5c1414;border:1px solid #e05151;color:#fff;border-radius:12px;padding:10px 12px;font:600 .8rem Outfit,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.5)'; document.body.appendChild(el); }
      var h = new Date(f.em), hh = ('0' + h.getHours()).slice(-2) + ':' + ('0' + h.getMinutes()).slice(-2);
      el.innerHTML = '⚠️ A Helena não consegue enviar mensagens no WhatsApp desde ' + hh + ': <b>' + String(f.motivo || 'a Meta recusou') + '</b>.' +
        (f.codigo === 131042 ? ' Regularize em business.facebook.com → Cobrança e pagamentos.' : '') +
        ' <span style="opacity:.8">Se ela já voltou a responder, ignore.</span> <button style="margin-left:6px;background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:3px 9px" onclick="this.parentNode.remove()">OK</button>';
    }).catch(function () {});
  }
  setTimeout(checar, 4000); setInterval(checar, 10 * 60000);
})();
