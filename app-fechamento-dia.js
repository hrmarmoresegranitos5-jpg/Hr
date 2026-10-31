// ══════════════════════════════════════════════════════════════
// FECHAMENTO DO DIA (bot do WhatsApp, 17h) → FINANÇAS
// O bot conduz o fechamento no WhatsApp (gastos, dinheiro, Pix, cartão, serviço fechado,
// saldo na conta e na carteira). Os lançamentos chegam por botSyncFinancas() (app-secretaria.js);
// aqui chegam os SALDOS e o resumo do dia, guardados neste aparelho (hr_fech_dia) e mostrados
// num cartão em Finanças. Também avisa o bot quando um extrato do mês é importado
// (para ele parar de lembrar).
//
// Rotas do Worker: GET /bot/fechamentos · POST /bot/extrato-ok
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var K = 'hr_fech_dia';
  var _busy = false, _ultimaSync = 0;

  function ler() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function gravar(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) { console.error('[FECHDIA]', e); } }
  function cfg() { return (typeof _getBotCfg === 'function') ? _getBotCfg() : {}; }
  function hdr() { return (typeof _botHeaders === 'function') ? _botHeaders() : { 'Content-Type': 'application/json' }; }
  function brl(v) { return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dmy(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Busca no Worker os fechamentos confirmados e guarda por data
  function sync(manual) {
    var c = cfg();
    if (!c.url || !c.key) { if (manual && typeof toast === 'function') toast('Conecte o bot primeiro (URL e chave).'); return; }
    if (_busy) return;
    _busy = true; _ultimaSync = Date.now();
    fetch(String(c.url).replace(/\/+$/, '') + '/bot/fechamentos', { headers: hdr() })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        _busy = false;
        if (!x.ok) { if (manual && typeof toast === 'function') toast('❌ ' + ((x.d && x.d.error) || 'Falha ao buscar fechamentos')); return; }
        var todos = ler(), novos = 0;
        (x.d.fechamentos || []).forEach(function (f) {
          if (!f || !f.data) return;
          if (!todos[f.data]) novos++;
          todos[f.data] = {
            data: f.data, saldoConta: Number(f.saldoConta) || 0, saldoCarteira: Number(f.saldoCarteira) || 0,
            servico: f.servico || '', valorServico: f.valorServico || null, totais: f.totais || {}
          };
        });
        // guarda só os últimos 400 dias
        var chaves = Object.keys(todos).sort();
        while (chaves.length > 400) delete todos[chaves.shift()];
        gravar(todos);
        if (novos && typeof toast === 'function') toast('📲 Fechamento do WhatsApp atualizado');
        else if (manual && typeof toast === 'function') toast('Nenhum fechamento novo.');
        pintar();
      })
      .catch(function () { _busy = false; if (manual && typeof toast === 'function') toast('❌ Worker não acessível.'); });
  }

  function ultimo() {
    var t = ler(), ks = Object.keys(t).sort();
    return ks.length ? t[ks[ks.length - 1]] : null;
  }

  // Saldo informado na conta no fechamento mais próximo de uma data (até 3 dias antes ou no próprio dia)
  function saldoContaEm(iso) {
    var t = ler(), melhor = null;
    Object.keys(t).forEach(function (k) {
      if (k > iso) return;
      var d = (Date.parse(iso + 'T12:00:00') - Date.parse(k + 'T12:00:00')) / 86400000;
      if (d <= 3 && (!melhor || k > melhor.data)) melhor = t[k];
    });
    return melhor;
  }

  function cardHtml() {
    var f = ultimo();
    var h = '<div class="fin-dm" id="finSaldosCard"><div class="fin-dm-t">🏦 Saldos informados no fechamento' + (f ? ' · ' + dmy(f.data) : '') + '</div>';
    if (!f) {
      h += '<div style="font-size:12px;opacity:.75;padding:4px 0 6px">O bot convoca o fechamento do dia às 17h pelo WhatsApp. Os saldos aparecem aqui.</div>';
    } else {
      var t = f.totais || {}, rec = (Number(t.dinheiro) || 0) + (Number(t.pix) || 0) + (Number(t.cartao) || 0);
      h += '<div class="fin-dm-r">' +
        '<div><small>Conta</small><b>R$ ' + brl(f.saldoConta) + '</b></div>' +
        '<div><small>Carteira</small><b>R$ ' + brl(f.saldoCarteira) + '</b></div>' +
        '<div><small>Total</small><b>R$ ' + brl(f.saldoConta + f.saldoCarteira) + '</b></div></div>';
      h += '<div style="font-size:12px;opacity:.8;margin-top:6px">Recebido no dia: R$ ' + brl(rec) +
        ' (dinheiro ' + brl(t.dinheiro) + ' · Pix ' + brl(t.pix) + ' · cartão ' + brl(t.cartao) + ') · Gastos: R$ ' + brl(t.gastos) +
        (f.servico ? '<br>Serviço fechado: ' + esc(f.servico) + (f.valorServico ? ' (R$ ' + brl(f.valorServico) + ')' : '') : '') + '</div>';
    }
    h += '<div style="margin-top:6px"><button class="fin-resumo-btn" style="margin:0" onclick="HR_FECHDIA.sync(true)">🔄 Atualizar do WhatsApp</button></div></div>';
    return h;
  }

  // Põe o cartão logo abaixo de "Dinheiro na mão"
  function pintar() {
    try {
      var ant = document.getElementById('finSaldosCard');
      if (ant && ant.parentNode) ant.parentNode.removeChild(ant);
      var ref = document.querySelector('.fin-dm');
      if (!ref || !ref.parentNode) return;
      var w = document.createElement('div');
      w.innerHTML = cardHtml();
      ref.parentNode.insertBefore(w.firstChild, ref.nextSibling);
    } catch (e) { console.warn('[FECHDIA] cartão:', e); }
  }

  // Avisa o bot que um extrato do mês (AAAA-MM) foi importado: ele conta quantos vieram (BB e Bradesco)
  function extratoImportado(mes) {
    var c = cfg();
    if (!c.url || !c.key || !/^\d{4}-\d{2}$/.test(String(mes || ''))) return;
    try {
      fetch(String(c.url).replace(/\/+$/, '') + '/bot/extrato-ok', { method: 'POST', headers: hdr(), body: JSON.stringify({ mes: mes }) })
        .catch(function () {});
    } catch (e) {}
  }

  function instalar() {
    if (typeof window.renderFin === 'function' && !window.renderFin._fechDia) {
      var orig = window.renderFin;
      var novo = function () {
        var r = orig.apply(this, arguments);
        pintar();
        if (Date.now() - _ultimaSync > 5 * 60 * 1000) sync(false);   // no máximo a cada 5 minutos
        return r;
      };
      novo._fechDia = true;
      window.renderFin = novo;
    }
    setTimeout(function () { sync(false); }, 6000);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(instalar, 1200); });
    else setTimeout(instalar, 1200);
  }

  window.HR_FECHDIA = { sync: sync, ultimo: ultimo, saldoContaEm: saldoContaEm, extratoImportado: extratoImportado, pintar: pintar, _cardHtml: cardHtml };
})();
