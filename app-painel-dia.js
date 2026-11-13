// app-painel-dia.js — v2: completa a tela Início (app-dashboard.js) com o que vem do bot:
//  • 🤖 em cada orçamento esperando resposta: o bot escreve para o cliente e pergunta se ainda tem interesse (retomada);
//  • 🌐 Projetos do site novos (o cliente montou no /portfolio) com atalho para montar o orçamento;
//  • 📐 visitas técnicas que o bot marcou (hoje e nos próximos dias), com mapa e WhatsApp.
// Não mexe no app-dashboard.js: desenha por cima depois que o Início é montado.
// Carregar DEPOIS de app-dashboard.js, app-secretaria.js e app-site-pedidos.js.
(function () {
  if (window.__hrPainelDia) return; window.__hrPainelDia = true;
  var BOT = { visitas: null, site: null, em: 0 };
  var RET_KEY = 'hr_painel_retomados';

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function botBase() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function botApi(path, opts) {
    var b = botBase(); if (!b) return Promise.reject(new Error('Bot não configurado'));
    opts = opts || {}; opts.headers = _botHeaders();
    return fetch(b + path, opts).then(function (r) { return r.json(); });
  }
  function wa(tel) { tel = String(tel || '').replace(/\D/g, ''); if (!tel) return ''; if (tel.length <= 11) tel = '55' + tel; return 'https://wa.me/' + tel; }
  function lerRet() { try { return JSON.parse(localStorage.getItem(RET_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function salvarRet(o) { try { localStorage.setItem(RET_KEY, JSON.stringify(o)); } catch (e) {} }
  function quandoRet(ms) { var d = Math.floor((Date.now() - ms) / 86400000); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + 'd'; }

  function carregarBot(forcar) {
    if (!botBase()) return;
    if (!forcar && Date.now() - BOT.em < 120000) return;
    BOT.em = Date.now();
    Promise.all([
      botApi('/bot/visitas').catch(function () { return null; }),
      botApi('/bot/site/leads').catch(function () { return null; })
    ]).then(function (r) {
      if (r[0] && Array.isArray(r[0].visitas)) BOT.visitas = r[0].visitas;
      if (r[1] && Array.isArray(r[1].leads)) BOT.site = r[1].leads;
      var pg = document.getElementById('pg12');
      if (pg && pg.classList.contains('on')) completar();
    });
  }

  function secao(titulo, extra, corpo, id) {
    return '<div data-painel="' + id + '"><div class="hm-sec"><span>' + titulo + '</span>' + (extra || '') + '</div><div class="hm-card">' + corpo + '</div></div>';
  }
  function completar() {
    var pg = document.getElementById('pg12'); if (!pg) return;
    pg.querySelectorAll('[data-painel]').forEach(function (x) { x.remove(); });
    var antesCobrar = pg.querySelector('.hm-sec'); // primeira seção ("💰 Cobrar")
    var hoje = td();

    // 🌐 projetos do site
    var site = (BOT.site || []).filter(function (l) { return (l.status || 'novo') === 'novo'; });
    if (site.length && antesCobrar) {
      var c = site.slice(0, 4).map(function (l) {
        return '<div class="hm-row"><div class="hm-row-main"><div class="hm-cli">' + esc(l.nome) + '</div>'
          + '<div class="hm-sub">' + esc([l.pedra && l.pedra.nm, l.cuba && l.cuba.nm, l.cidade].filter(Boolean).join(' · ')) + '</div></div>'
          + '<div class="hm-row-r"><div class="hm-btns"><button class="hm-b hm-ok" onclick="event.stopPropagation();go(0)">✦ Montar</button></div></div></div>';
      }).join('');
      antesCobrar.insertAdjacentHTML('beforebegin', secao('🌐 Projetos do site', '<b style="color:var(--gold2);">' + site.length + ' novo' + (site.length > 1 ? 's' : '') + '</b>', c, 'site'));
    }

    // 📐 visitas marcadas pelo bot (hoje e próximos 7 dias)
    var vis = (BOT.visitas || []).filter(function (v) { return v.marcada && v.data && v.data >= hoje && dDiff(v.data) <= 7; });
    if (vis.length && antesCobrar) {
      var cv = vis.slice(0, 5).map(function (v) {
        var df = dDiff(v.data), lbl = df === 0 ? 'HOJE' : df === 1 ? 'AMANHÃ' : fd(v.data);
        return '<div class="hm-row"><div class="hm-row-main"><div class="hm-cli">📐 ' + esc(v.cliente || v.numero) + '</div>'
          + '<div class="hm-sub"><b style="color:' + (df === 0 ? '#60a5fa' : 'var(--t2)') + ';">' + lbl + (v.hora ? ' às ' + esc(v.hora) : '') + '</b>' + (v.endereco ? ' · ' + esc(v.endereco) : '') + (v.ambiente ? ' · ' + esc(v.ambiente) : '') + '</div></div>'
          + '<div class="hm-row-r"><div class="hm-btns">'
          + (v.mapa ? '<a class="hm-b" href="' + esc(v.mapa) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="text-decoration:none;">Mapa</a>' : '')
          + '<a class="hm-b hm-zap" href="' + esc(wa(v.numero)) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="text-decoration:none;">WhatsApp</a></div></div></div>';
      }).join('');
      var nh = vis.filter(function (v) { return v.data === hoje; }).length;
      antesCobrar.insertAdjacentHTML('beforebegin', secao('📐 Visitas técnicas', nh ? '<b style="color:#60a5fa;">' + nh + ' hoje</b>' : '', cv, 'visitas'));
    }

    // 🤖 em cada orçamento esperando resposta
    var ret = lerRet();
    pg.querySelectorAll('button[onclick*="_dashZapOrc("]').forEach(function (b) {
      var m = /_dashZapOrc\('([^']+)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      var id = m[1], q = DB.q.find(function (x) { return String(x.id) === id; });
      if (!q || !q.tel || b.parentNode.querySelector('[data-retomar]')) return;
      var feito = ret[id];
      var nb = document.createElement('button');
      nb.className = 'hm-b'; nb.setAttribute('data-retomar', id);
      nb.title = 'O bot escreve para o cliente perguntando se ainda tem interesse';
      nb.textContent = feito ? '🤖 ' + quandoRet(feito) : '🤖 Bot';
      if (feito && Date.now() - feito < 3 * 86400000) nb.disabled = true;
      b.insertAdjacentElement('afterend', nb);
    });
  }

  var orig = window.renderDashboard;
  if (typeof orig === 'function') {
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      try { completar(); } catch (e) { console.error('painel do dia', e); }
      carregarBot(false);
      return r;
    };
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-retomar]'); if (!b) return;
    ev.stopPropagation(); ev.preventDefault();
    var q = DB.q.find(function (x) { return String(x.id) === b.getAttribute('data-retomar'); }); if (!q) return;
    var pedido = [String(q.tipo || '').replace(/\+/g, ' + '), q.mat].filter(Boolean).join(' em ');
    if (!confirm('O bot vai escrever para ' + (q.cli || 'o cliente') + ' perguntando se ainda tem interesse no orçamento' + (pedido ? ' de ' + pedido : '') + '.\n\nMandar agora?')) return;
    b.disabled = true; b.textContent = '🤖 …';
    botApi('/bot/retomar', { method: 'POST', body: JSON.stringify({ tel: q.tel, nome: q.cli, pedido: pedido, valor: q.vista || 0 }) }).then(function (j) {
      if (j && j.ok) {
        var r = lerRet(); r[String(q.id)] = Date.now(); salvarRet(r);
        q._followUp = td(); try { DB.sv(); } catch (e) {}
        toast('🤖 Pronto! O bot cuidou da retomada de ' + (q.cli || 'o cliente') + ' — confira no WhatsApp.');
        renderDashboard();
      } else { b.disabled = false; b.textContent = '🤖 Bot'; toast('⚠️ ' + ((j && (j.erro || j.error)) || 'Não deu para enviar agora.')); }
    }).catch(function (e) { b.disabled = false; b.textContent = '🤖 Bot'; toast('⚠️ ' + e.message); });
  }, true);

  document.addEventListener('visibilitychange', function () { if (!document.hidden) carregarBot(true); });
  setTimeout(function () { carregarBot(true); }, 3000);
})();
