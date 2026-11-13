// app-mercadopago.js — v1 (13/11/2026): MERCADO PAGO DENTRO DO APP (Finanças)
// Saldo, entradas e saídas do mês e cada movimentação lida do relatório do Mercado Pago pelo bot.
// O que ainda não foi lançado nas finanças aparece com botões para lançar (com categoria) ou ignorar,
// sem precisar responder no WhatsApp. "Atualizar" pede um relatório novo ao Mercado Pago (leva alguns minutos).
// Rotas do Worker (v56): GET /bot/mp/painel · POST /bot/mp/atualizar · POST /bot/mp/decidir
(function () {
  'use strict';
  var D = null, carregando = false, filtro = 'pend', poll = null;

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function api(path, opts) {
    var b = base(); if (!b) return Promise.reject(new Error('Bot não configurado no app.'));
    opts = opts || {}; opts.headers = _botHeaders();
    return fetch(b + path, opts).then(function (r) { return r.json(); });
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dm(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function quando(ms) {
    if (!ms) return '';
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return 'agora há pouco'; if (m < 60) return 'há ' + m + ' min';
    var h = Math.round(m / 60); if (h < 24) return 'há ' + h + ' h';
    return 'em ' + new Date(ms).toLocaleDateString('pt-BR');
  }

  function caixa() {
    var pg = document.getElementById('pg4'); if (!pg) return null;
    var el = document.getElementById('mpPainel');
    if (!el) {
      el = document.createElement('div'); el.id = 'mpPainel';
      el.style.cssText = 'margin:12px 14px 4px;background:var(--s2);border:1px solid var(--bd2);border-radius:16px;overflow:hidden;';
      var ref = document.getElementById('finMiniCards') || pg.querySelector('.finhero');
      if (ref) ref.insertAdjacentElement('afterend', el); else pg.insertBefore(el, pg.firstChild);
    }
    return el;
  }

  function render() {
    var el = caixa(); if (!el) return;
    if (!base()) { el.style.display = 'none'; return; }
    el.style.display = '';
    if (!D) { el.innerHTML = '<div style="padding:14px;font-size:.78rem;color:var(--t3);">🏦 Carregando o Mercado Pago…</div>'; return; }
    if (D.ativo === false) { el.innerHTML = '<div style="padding:14px;font-size:.78rem;color:var(--t3);">🏦 O Mercado Pago não está ligado no bot (falta MP_ACCESS_TOKEN no Worker).</div>'; return; }
    var sd = D.saldo, movs = D.movs || [];
    var pend = movs.filter(function (m) { return m.status === 'pend'; });
    var lista = filtro === 'pend' ? pend : movs;
    var h = '<div style="padding:14px 14px 10px;background:linear-gradient(135deg,rgba(0,158,227,.14),transparent);">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><div style="font-size:.66rem;letter-spacing:.14em;color:#4fb8ec;font-weight:800;">🏦 MERCADO PAGO</div>'
      + '<button type="button" data-mp="atualizar" style="padding:6px 10px;border-radius:9px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-size:.68rem;font-weight:700;font-family:inherit;cursor:pointer;">' + (D.gerando ? '⏳ Gerando…' : '↻ Atualizar') + '</button></div>'
      + '<div style="font-size:1.6rem;font-weight:800;color:var(--tx);margin-top:6px;">' + (sd ? brl(sd.valor) : '—') + '</div>'
      + '<div style="font-size:.66rem;color:var(--t3);">' + (sd ? 'Saldo em ' + dm(sd.data) + (sd.em ? ' · lido ' + quando(sd.em) : '') : 'Ainda sem leitura do saldo') + (D.gerando ? ' · o Mercado Pago está preparando o relatório' : '') + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;">'
      + '<div style="flex:1;background:rgba(93,191,122,.08);border-radius:10px;padding:8px 10px;"><div style="font-size:.6rem;color:var(--t3);">Entrou no mês</div><div style="font-weight:800;color:#5dbf7a;">' + brl(D.mes && D.mes.ent) + '</div></div>'
      + '<div style="flex:1;background:rgba(240,138,138,.08);border-radius:10px;padding:8px 10px;"><div style="font-size:.6rem;color:var(--t3);">Saiu no mês</div><div style="font-weight:800;color:#f08a8a;">' + brl(D.mes && D.mes.sai) + '</div></div></div></div>';
    h += '<div style="display:flex;gap:6px;padding:8px 14px 0;">'
      + ['pend', 'todas'].map(function (f) {
        var on = filtro === f;
        return '<button type="button" data-mp-filtro="' + f + '" style="padding:6px 10px;border-radius:20px;border:1px solid ' + (on ? 'var(--gold2)' : 'var(--bd2)') + ';background:' + (on ? 'rgba(201,168,76,.12)' : 'transparent') + ';color:' + (on ? 'var(--gold2)' : 'var(--t3)') + ';font-size:.68rem;font-weight:700;font-family:inherit;cursor:pointer;">'
          + (f === 'pend' ? 'Para conferir (' + pend.length + ')' : 'Todas (' + movs.length + ')') + '</button>';
      }).join('') + '</div>';
    h += '<div style="padding:8px 14px 12px;">';
    if (D.erro) h += '<div style="font-size:.72rem;color:#f08a8a;background:rgba(240,138,138,.08);border:1px solid rgba(240,138,138,.3);border-radius:10px;padding:9px 10px;margin:4px 0 8px;line-height:1.4;">⚠️ Não consegui ler o Mercado Pago ' + quando(D.erro.em) + ':<br><b>' + esc(D.erro.msg) + '</b><br><span style="color:var(--t3);">Mande um print disto para o desenvolvedor.</span></div>';
    var semLeitura = !D.ultimaLeitura && !movs.length;
    if (D.gerando) h += '<div style="font-size:.74rem;color:#4fb8ec;padding:8px 0;">⏳ O Mercado Pago está preparando o relatório' + (D.gerando.desde ? ' (pedido ' + quando(D.gerando.desde) + ')' : '') + '. Costuma levar de 2 a 10 minutos; o app confere sozinho.</div>';
    if (D.gerando || D.erro) h += '<button type="button" data-mp="testar" style="width:100%;margin:2px 0 8px;padding:9px;border-radius:10px;border:1px dashed #4fb8ec;background:transparent;color:#4fb8ec;font-size:.74rem;font-weight:700;font-family:inherit;cursor:pointer;">🔧 Testar conexão e pedir de novo</button>';
    if (!D.gerando && !D.erro && (D.movs || []).length) h += '<button type="button" data-mp="nomes" style="width:100%;margin:2px 0 8px;padding:8px;border-radius:10px;border:1px dashed var(--bd2);background:transparent;color:var(--t2);font-size:.7rem;font-weight:700;font-family:inherit;cursor:pointer;">🔎 Testar se o bot consegue ver quem recebeu os Pix</button>';
    if (window._mpTeste) h += '<div style="font-size:.64rem;color:var(--t2);background:rgba(79,184,236,.07);border:1px solid rgba(79,184,236,.3);border-radius:9px;padding:8px 9px;margin-bottom:8px;line-height:1.5;word-break:break-word;"><b>Teste do Mercado Pago</b> (mande print deste quadro):' + window._mpTeste.map(function (l) { return '<br>• ' + esc(l); }).join('') + '</div>';
    if (D.gerando && D.diag) h += '<div style="font-size:.62rem;color:var(--t3);background:rgba(255,255,255,.03);border-radius:8px;padding:6px 8px;margin-bottom:6px;line-height:1.45;">Diagnóstico (mande print se demorar): ' + (D.diag.total || 0) + ' relatório(s) na conta' + (D.diag.ultimos || []).map(function (u) { return '<br>• ' + esc(u.f) + ' · ' + esc(u.st || '?') + ' · ' + esc(u.criado || '') + ' · de ' + esc(u.de || ''); }).join('') + (D.diag.criacao ? '<br>pedido: ' + esc(D.diag.criacao) : '') + '<br>escolhido: ' + esc(D.diag.escolhido || 'nenhum') + ' · ' + quando(D.diag.em) + '</div>';
    else if (semLeitura && !D.erro) h += '<div style="font-size:.74rem;color:var(--t3);padding:8px 0;">Ainda não li o seu Mercado Pago. Toque em <b>↻ Atualizar</b> para buscar tudo desde o começo do mês.</div>';
    else if (!lista.length) h += '<div style="font-size:.74rem;color:var(--t3);padding:8px 0;">' + (filtro === 'pend' ? '✓ Tudo do Mercado Pago já entrou sozinho nas finanças.' : 'Nenhuma movimentação nos últimos 30 dias.') + '</div>';
    lista.slice(0, 40).forEach(function (m) {
      var ent = m.sentido === 'in';
      var st = { ok: '✓ já lançada', lancado: '✓ lançada', ignorado: '— ignorada', pend: '● para conferir' }[m.status] || m.status;
      h += '<div style="border-top:1px solid var(--bd);padding:9px 0;">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">'
        + '<div style="min-width:0;"><div style="font-size:.78rem;color:var(--tx);font-weight:600;overflow-wrap:anywhere;">' + esc(/^(payment|pagamento)$/i.test(m.descr || '') ? 'Pagamento recebido (venda)' : (m.descr || m.tipo || 'Movimentação')) + '</div>'
        + '<div style="font-size:.64rem;color:var(--t3);">' + dm(m.data) + ' · ' + esc(m.tipo || '') + ' · <span style="color:' + (m.status === 'pend' ? 'var(--gold2)' : 'var(--t4)') + ';">' + st + '</span></div></div>'
        + '<div style="font-weight:800;white-space:nowrap;color:' + (ent ? '#5dbf7a' : '#f08a8a') + ';">' + (ent ? '+' : '−') + brl(m.valor) + '</div></div>';
      if (m.status === 'pend') {
        h += '<div style="display:flex;gap:6px;margin-top:7px;">';
        if (ent) {
          h += '<button type="button" data-mp-lancar="' + esc(m.h) + '" style="flex:1;padding:8px;border-radius:9px;border:none;background:var(--gold3);color:#000;font-weight:800;font-size:.7rem;font-family:inherit;cursor:pointer;">Lançar entrada</button>';
        } else {
          var cats = D.categorias || {};
          h += '<select data-mp-cat="' + esc(m.h) + '" style="flex:1;min-width:0;padding:7px;border-radius:9px;border:1px solid var(--bd2);background:var(--s1);color:var(--tx);font-size:.7rem;font-family:inherit;">'
            + '<option value="">Categoria…</option>' + Object.keys(cats).map(function (k) { return '<option value="' + esc(k) + '">' + esc(cats[k]) + '</option>'; }).join('') + '</select>'
            + '<button type="button" data-mp-lancar="' + esc(m.h) + '" style="padding:8px 12px;border-radius:9px;border:none;background:var(--gold3);color:#000;font-weight:800;font-size:.7rem;font-family:inherit;cursor:pointer;">Lançar</button>';
        }
        h += '<button type="button" data-mp-ignorar="' + esc(m.h) + '" style="padding:8px 10px;border-radius:9px;border:1px solid var(--bd2);background:transparent;color:var(--t3);font-weight:700;font-size:.68rem;font-family:inherit;cursor:pointer;">' + (ent ? 'Ignorar' : 'Não é gasto') + '</button></div>';
      }
      h += '</div>';
    });
    h += '</div>';
    el.innerHTML = h;
  }

  // lançamentos internos do Mercado Pago (reserve_for_payout / payout_cancel) que a leitura antiga lançou como entrada
  function limparInternas(ids) {
    if (typeof DB === 'undefined' || !DB.t) return;
    var antes = DB.t.length, set = {}; ids.forEach(function (i) { set[i] = 1; });
    DB.t = DB.t.filter(function (t) { return !(set[t.waId] || /reserve_for_payout|payout_cancel|recebido de payout\b/i.test(t.desc || '')); });
    var n = antes - DB.t.length;
    if (n) { try { DB.sv(); } catch (e) {} try { if (typeof renderFin === 'function') renderFin(); } catch (e) {} if (typeof toast === 'function') toast('🧹 Tirei ' + n + ' lançamento(s) internos do Mercado Pago que tinham entrado por engano'); }
  }
  function carregar() {
    if (!base() || carregando) return;
    carregando = true;
    api('/bot/mp/painel?dias=30').then(function (d) {
      carregando = false;
      if (d && !d.error) {
        D = d;
        limparInternas(d.apagarApp || []);
        if (D.gerando) vigiar();
        else if (D.ativo !== false && !D.ultimaLeitura && !(D.movs || []).length && !D.erro && !window._mpAutoPedido) { // primeira vez: busca sozinho
          window._mpAutoPedido = true;
          api('/bot/mp/atualizar', { method: 'POST', body: JSON.stringify({ dias: Math.min(30, new Date().getDate() + 1) }) }).then(function (r) {
            if (r && r.ok && r.gerando) { D.gerando = { desde: Date.now() }; vigiar(); }
            else if (r && !r.ok) D.erro = { msg: r.error || 'Falha ao pedir o relatório', em: Date.now() };
            render();
          }).catch(function () {});
        }
      }
      else if (!D) D = { movs: [], mes: { ent: 0, sai: 0 }, erro: { msg: (d && d.error) || 'O bot não respondeu agora. Toque em ↻ Atualizar ou abra de novo em 1 minuto.', em: Date.now() } };
      render();
    })
      .catch(function (e) { carregando = false; if (!D) D = { movs: [], mes: { ent: 0, sai: 0 }, erro: { msg: 'Sem conexão com o bot (' + ((e && e.message) || 'erro') + '). Abra de novo em 1 minuto.', em: Date.now() } }; render(); setTimeout(carregar, 60000); });
  }
  function vigiar() { // enquanto o relatório é gerado, confere a cada 40 s (o bot processa quando fica pronto)
    if (poll) return;
    var n = 0;
    poll = setInterval(function () {
      n++;
      api('/bot/mp/atualizar', { method: 'POST', body: '{}' }).catch(function () {}).then(function () {
        api('/bot/mp/painel?dias=30').then(function (d) {
          if (d && !d.error) D = d;
          if (!D || !D.gerando || n > 20) { clearInterval(poll); poll = null; if (D && !D.gerando && typeof toast === 'function') toast('🏦 Mercado Pago atualizado'); }
          render();
        }).catch(function () {});
      });
    }, 40000);
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t.closest) return;
    var f = t.closest('[data-mp-filtro]'); if (f) { filtro = f.getAttribute('data-mp-filtro'); render(); return; }
    if (t.closest('[data-mp="nomes"]')) {
      var bn = t.closest('[data-mp="nomes"]'); bn.disabled = true; bn.textContent = '⏳ Testando…';
      api('/bot/mp/diagnostico', { method: 'POST', body: JSON.stringify({ nomes: true }) }).then(function (r) { window._mpTeste = (r && r.linhas) || ['Sem resposta do bot.']; render(); })
        .catch(function (e) { window._mpTeste = ['Falhou: ' + e.message]; render(); });
      return;
    }
    if (t.closest('[data-mp="testar"]')) {
      var bt = t.closest('[data-mp="testar"]'); bt.disabled = true; bt.textContent = '⏳ Testando… (até 30 s)';
      api('/bot/mp/diagnostico', { method: 'POST', body: JSON.stringify({ recomecar: true }) }).then(function (r) {
        window._mpTeste = (r && r.linhas) || ['Sem resposta do bot.'];
        carregar();
      }).catch(function (e) { window._mpTeste = ['Falhou: ' + e.message]; render(); });
      return;
    }
    if (t.closest('[data-mp="atualizar"]')) {
      api('/bot/mp/atualizar', { method: 'POST', body: JSON.stringify({ dias: (D && D.movs && D.movs.length) ? 3 : Math.min(30, new Date().getDate() + 1) }) }).then(function (r) {
        if (r && r.recente) toast('O Mercado Pago foi consultado há pouco. Tente de novo em ' + r.espera + ' min.');
        else if (r && r.ok) { toast('🏦 Pedi o relatório ao Mercado Pago. Leva alguns minutos.'); if (D) { D.gerando = { desde: Date.now() }; D.erro = null; } render(); vigiar(); }
        else toast('⚠️ ' + ((r && r.error) || 'Não deu para atualizar agora.'));
      }).catch(function (e) { toast('⚠️ ' + e.message); });
      return;
    }
    var l = t.closest('[data-mp-lancar]'), ig = t.closest('[data-mp-ignorar]');
    if (!l && !ig) return;
    var h = (l || ig).getAttribute(l ? 'data-mp-lancar' : 'data-mp-ignorar');
    var m = (D && D.movs || []).find(function (x) { return x.h === h; }); if (!m) return;
    var body = { h: h, acao: ig ? 'ignorar' : 'lancar' };
    if (l && m.sentido === 'out') {
      var sel = document.querySelector('[data-mp-cat="' + h + '"]');
      body.cat = sel ? sel.value : '';
      if (!body.cat) { toast('Escolha a categoria do gasto.'); if (sel) sel.focus(); return; }
    }
    (l || ig).disabled = true;
    api('/bot/mp/decidir', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
      if (r && r.ok) {
        m.status = r.status; render();
        toast(r.status === 'lancado' ? '✓ Lançado nas finanças' : 'Ignorado');
        try { if (typeof botSyncFinancas === 'function') setTimeout(function () { botSyncFinancas(false); }, 800); } catch (e) {}
      } else { (l || ig).disabled = false; toast('⚠️ ' + ((r && r.erro) || (r && r.error) || 'Não deu agora.')); if (r && /resolvida/.test(r.erro || '')) carregar(); }
    }).catch(function (e) { (l || ig).disabled = false; toast('⚠️ ' + e.message); });
  }, true);

  function iniciar() {
    var pg = document.getElementById('pg4'); if (!pg) return;
    var ultimo = 0;
    new MutationObserver(function () {
      if (pg.classList.contains('on') && Date.now() - ultimo > 60000) { ultimo = Date.now(); render(); carregar(); }
      else if (pg.classList.contains('on') && !document.getElementById('mpPainel')) render();
    }).observe(pg, { attributes: true, attributeFilter: ['class'], childList: true });
    if (pg.classList.contains('on')) { ultimo = Date.now(); render(); carregar(); }
  }
  window.mpPainelCarregar = carregar;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
