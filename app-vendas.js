// app-vendas.js — v1: seção "💼 Vendas" no Início, com o que o bot sabe de vendas (GET /bot/vendas):
//  • dinheiro parado (orçamentos sem resposta) com 🤖 Retomar: o bot prepara a mensagem e manda a PRÉVIA no WhatsApp do dono;
//  • clientes quentes (sinal de compra nos últimos 3 dias), com atalho para o WhatsApp;
//  • quem reconquistar (desistiu há 1-2 meses), previsão de caixa de 4 semanas e campanhas ativas;
//  • atalhos: radar da semana, ideias de promoção, plano de 30 dias, previsão de caixa no WhatsApp, "minha ideia de promoção".
// Não mexe no app-dashboard.js: desenha por cima depois que o Início é montado. Carregar DEPOIS de app-painel-dia.js.
(function () {
  if (window.__hrVendas) return; window.__hrVendas = true;
  var V = { d: null, em: 0, carregando: false, abertos: {} };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function botBase() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function botApi(path, opts) {
    var b = botBase(); if (!b) return Promise.reject(new Error('Bot não configurado'));
    opts = opts || {}; opts.headers = _botHeaders();
    return fetch(b + path, opts).then(function (r) { return r.json(); });
  }
  function R(v) { return 'R$ ' + Math.round(+v || 0).toLocaleString('pt-BR'); }
  function tel(n) { return String(n || '').replace(/^55(\d{2})(9?\d{4})(\d{4})$/, '($1) $2-$3'); }
  function aviso(t) { try { if (typeof toast === 'function') return toast(t); } catch (e) {} alert(t); }

  function carregar(forcar) {
    if (!botBase() || V.carregando) return;
    if (!forcar && Date.now() - V.em < 120000) return;
    V.carregando = true; V.em = Date.now();
    botApi('/bot/vendas').then(function (j) {
      V.carregando = false; if (!j || !j.ok) return;
      V.d = j;
      try { desenharHome(); } catch (e) {}
      var pg = document.getElementById('pg12'); if (pg && pg.classList.contains('on')) desenhar();
    }).catch(function () { V.carregando = false; });
  }

  function linha(main, sub, dir) {
    return '<div class="hm-row"><div class="hm-row-main"><div class="hm-cli">' + main + '</div>' + (sub ? '<div class="hm-sub">' + sub + '</div>' : '') + '</div>' + (dir ? '<div class="hm-row-r">' + dir + '</div>' : '') + '</div>';
  }
  function bloco(titulo, conteudo) { return '<div style="font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold2,#c9a84c);margin:12px 0 4px;font-weight:800;">' + titulo + '</div>' + conteudo; }

  function desenhar() {
    var pg = document.getElementById('pg12'); if (!pg) return;
    var velho = pg.querySelector('[data-vendas]'); if (velho) velho.remove();
    var d = V.d; if (!d) return;
    var primeira = pg.querySelector('.hm-sec'); if (!primeira) return;

    var kpi = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px;">'
      + kp('Parado', R(d.totalParado), d.nParados + ' orç.', d.nParados ? '#f0b45a' : '')
      + kp('Retomadas', (d.retomadas.resp || 0) + '/' + (d.retomadas.env || 0), 'responderam 7d', '')
      + kp('Quentes', String((d.quentes || []).length), 'últimos 3 dias', (d.quentes || []).length ? '#5dbf7a' : '')
      + '</div>';

    var q = (d.quentes || []).slice(0, 3).map(function (x) {
      return linha('🔥 ' + esc(x.nome || tel(x.num)), '"' + esc(x.t) + '"', '<div class="hm-btns"><a class="hm-b hm-ok" href="https://wa.me/' + esc(x.num) + '" target="_blank" onclick="event.stopPropagation()">WhatsApp</a></div>');
    }).join('');

    var todosP = V.abertos.par; var par = (d.parados || []).slice(0, todosP ? 25 : 4).map(function (x) {
      return linha(esc(x.nome || tel(x.num)), x.dias + ' dias' + (x.desc ? ' · ' + esc(x.desc) : ''), '<div style="font-weight:800;font-size:.82rem;margin-right:6px;">' + (x.valor ? R(x.valor) : '') + '</div><div class="hm-btns"><button class="hm-b hm-ok" data-vd-acao="retomar" data-vd-num="' + esc(x.num) + '">🤖 Retomar</button></div>');
    }).join('');
    if ((d.parados || []).length > 4) par += '<div data-vd-mais="par" style="text-align:center;font-size:.75rem;color:var(--gold2,#c9a84c);padding:8px;cursor:pointer;font-weight:700;">' + (todosP ? 'Mostrar menos' : 'Ver todos (' + d.parados.length + ')') + '</div>';

    var rq = (d.perdidos || []).slice(0, 3).map(function (x) {
      return linha(esc(x.nome || tel(x.num)), esc(x.motivo || ''), '<div style="font-weight:800;font-size:.82rem;margin-right:6px;">' + (x.valor ? R(x.valor) : '') + '</div><div class="hm-btns"><button class="hm-b" data-vd-acao="reconquistar" data-vd-num="' + esc(x.num) + '">↩︎ Tentar</button></div>');
    }).join('');

    var mx = 1; (d.caixa || []).forEach(function (w) { mx = Math.max(mx, w.ent, w.sai); });
    var cx = (d.caixa || []).map(function (w, i) {
      var sd = w.ent - w.sai;
      return '<div style="display:grid;grid-template-columns:62px 1fr 78px;gap:6px;align-items:center;font-size:.74rem;padding:4px 0;">'
        + '<span style="color:var(--t3,#999);">' + (i ? w.ini.slice(8, 10) + '/' + w.ini.slice(5, 7) : 'Esta sem.') + '</span>'
        + '<div><div style="height:7px;border-radius:4px;background:#5dbf7a;width:' + (w.ent / mx * 100) + '%"></div><div style="height:7px;border-radius:4px;margin-top:2px;background:#f08a8a;width:' + (w.sai / mx * 100) + '%"></div></div>'
        + '<span style="text-align:right;font-weight:800;color:' + (sd >= 0 ? '#5dbf7a' : '#f08a8a') + ';">' + (sd >= 0 ? '+' : '−') + R(Math.abs(sd)) + '</span></div>';
    }).join('');

    var pr = (d.promos || []).map(function (p) { return linha('📣 ' + esc(p.t), 'até ' + esc(String(p.ate).slice(8, 10) + '/' + String(p.ate).slice(5, 7)), '<div style="font-size:.78rem;font-weight:800;">' + p.leads + ' interessados</div>'); }).join('');

    var atalhos = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px;">'
      + at('radar', '📊 Radar da semana') + at('promo', '💡 Ideias de promoção') + at('plano', '🗺️ Plano de 30 dias') + at('caixa', '💵 Caixa no WhatsApp')
      + '<button class="hm-b" data-vd-ideia style="grid-column:1/-1;padding:10px;">✍️ Tenho uma ideia de promoção</button></div>'
      + '<div style="font-size:.68rem;color:var(--t3,#999);margin-top:8px;line-height:1.5;">As ações abrem no seu WhatsApp: o bot prepara e o senhor aprova antes de qualquer mensagem ir ao cliente.</div>';

    var m = d.meta, metaH;
    if (m && m.meta) {
      var pc = Math.min(100, m.pct || 0), cor = m.feito >= m.meta ? '#5dbf7a' : m.proj >= m.meta ? '#c9a84c' : '#f0b45a';
      metaH = '<div data-vd-meta style="cursor:pointer;background:rgba(255,255,255,.04);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:10px;padding:9px 10px;margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;font-size:.74rem;"><span>🎯 Meta do mês</span><b>' + R(m.feito) + ' de ' + R(m.meta) + ' · ' + (m.pct || 0) + '%</b></div>'
        + '<div style="height:9px;border-radius:5px;background:rgba(255,255,255,.08);margin:6px 0;overflow:hidden;"><div style="height:100%;width:' + pc + '%;background:' + cor + ';"></div></div>'
        + '<div style="font-size:.68rem;color:var(--t3,#999);">' + (m.falta ? 'Faltam ' + R(m.falta) + ' · ' + R(m.porDia) + ' por dia útil (' + m.uteisResta + ' dias) · no ritmo atual: ' + R(m.proj) : 'Meta batida! 🎉') + '</div></div>';
    } else metaH = '<button class="hm-b" data-vd-meta style="width:100%;padding:9px;margin-bottom:8px;">🎯 Definir meta de vendas do mês</button>';
    var corpo = metaH + kpi
      + (q ? bloco('Clientes quentes', q) : '')
      + bloco('Orçamentos sem resposta', par || '<div class="hm-sub" style="padding:8px 2px;">Nenhum orçamento parado. 👏</div>')
      + (cx ? bloco('Previsão de caixa (4 semanas)', cx) : '')
      + (rq ? bloco('Para reconquistar', rq) : '')
      + (pr ? bloco('Campanhas', pr) : '')
      + atalhos;
    var extra = d.nParados ? '<b style="color:#f0b45a;">' + R(d.totalParado) + ' parado</b>' : '';
    primeira.insertAdjacentHTML('beforebegin', '<div data-vendas><div class="hm-sec"><span>💼 Vendas</span>' + extra + '</div><div class="hm-card">' + corpo + '</div></div>');
  }
  // cartão no topo da tela inicial (antes do "Acesso Rápido"): resumo e atalho para o Painel
  function desenharHome() {
    var ref = document.getElementById('homePosVenda'); if (!ref) return;
    var c = document.getElementById('homeVendas'); var d = V.d;
    if (!d || (!d.nParados && !(d.quentes || []).length && !(d.perdidos || []).length && !(d.meta && d.meta.meta))) { if (c) c.remove(); return; }
    var neg = (d.caixa || []).slice(0, 2).filter(function (w) { return w.sai - w.ent > 300; })[0];
    var partes = [];
    if (d.meta && d.meta.meta) partes.push('🎯 <b style="color:' + (d.meta.proj >= d.meta.meta ? '#5dbf7a' : '#f0b45a') + ';">' + (d.meta.pct || 0) + '% da meta</b>');
    if (d.nParados) partes.push('<b style="color:#f0b45a;">' + R(d.totalParado) + '</b> parado em ' + d.nParados + ' orçamento' + (d.nParados > 1 ? 's' : ''));
    if ((d.quentes || []).length) partes.push('<b style="color:#5dbf7a;">' + d.quentes.length + ' cliente' + (d.quentes.length > 1 ? 's' : '') + ' quente' + (d.quentes.length > 1 ? 's' : '') + '</b>');
    if (neg) partes.push('<b style="color:#f08a8a;">caixa −' + R(neg.sai - neg.ent) + '</b> ' + (d.caixa.indexOf(neg) ? 'semana que vem' : 'esta semana'));
    var h = '<div id="homeVendas" data-vd-home style="margin:10px 14px 0;padding:12px 14px;border-radius:16px;border:1px solid rgba(201,168,76,.35);background:linear-gradient(135deg,rgba(201,168,76,.10),rgba(0,0,0,.25));cursor:pointer;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:.68rem;letter-spacing:.16em;font-weight:800;color:#e3c88f;">💼 VENDAS</span><span style="font-size:.7rem;color:rgba(255,255,255,.55);">abrir →</span></div>'
      + '<div style="font-size:.86rem;color:#f3eee5;margin-top:6px;line-height:1.5;">' + partes.join(' · ') + '</div></div>';
    if (c) c.outerHTML = h; else ref.insertAdjacentHTML('afterend', h);
  }
  function kp(t, v, s, cor) { return '<div style="background:rgba(255,255,255,.04);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:10px;padding:8px;"><div style="font-size:.62rem;color:var(--t3,#999);text-transform:uppercase;letter-spacing:.06em;">' + t + '</div><div style="font-size:1.02rem;font-weight:800;' + (cor ? 'color:' + cor + ';' : '') + '">' + v + '</div><div style="font-size:.62rem;color:var(--t3,#999);">' + s + '</div></div>'; }
  function at(a, t) { return '<button class="hm-b" data-vd-acao="' + a + '" style="padding:10px;">' + t + '</button>'; }

  function acao(b, a, num, texto) {
    var txt = b.textContent; b.disabled = true; b.textContent = '…';
    botApi('/bot/vendas/acao', { method: 'POST', body: JSON.stringify({ acao: a, num: num || '', texto: texto || '' }) }).then(function (j) {
      if (j && j.ok) { b.textContent = '✓ No WhatsApp'; aviso(a === 'retomar' || a === 'reconquistar' ? '🤖 A prévia da mensagem chegou no seu WhatsApp. Toque em Enviar lá.' : '📲 Mandei no seu WhatsApp.'); setTimeout(function () { carregar(true); }, 4000); }
      else { b.disabled = false; b.textContent = txt; aviso('⚠️ ' + ((j && (j.erro || j.error)) || 'Não deu para chamar o bot agora.')); }
    }).catch(function (e) { b.disabled = false; b.textContent = txt; aviso('⚠️ ' + e.message); });
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t.closest) return;
    var b = t.closest('[data-vd-acao]');
    if (b) { ev.stopPropagation(); ev.preventDefault(); acao(b, b.getAttribute('data-vd-acao'), b.getAttribute('data-vd-num')); return; }
    var m = t.closest('[data-vd-mais]');
    if (m) { ev.stopPropagation(); var k = m.getAttribute('data-vd-mais'); V.abertos[k] = !V.abertos[k]; desenhar(); return; }
    var hm = t.closest('[data-vd-home]');
    if (hm) { ev.stopPropagation(); try { openApp(12); } catch (e) {} setTimeout(function () { var x = document.querySelector('[data-vendas]'); if (x && x.scrollIntoView) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 600); return; }
    var mt = t.closest('[data-vd-meta]');
    if (mt) { ev.stopPropagation(); var atual = V.d && V.d.meta && V.d.meta.meta; var v = prompt('Meta de vendas fechadas neste mês (R$):', atual ? String(Math.round(atual)) : ''); if (v && /\d/.test(v)) { var todo = confirm('Usar essa meta também nos próximos meses?');
      botApi('/bot/vendas/acao', { method: 'POST', body: JSON.stringify({ acao: 'meta', valor: v.replace(/[^\d,.]/g, ''), todoMes: todo }) }).then(function (j) { if (j && j.ok) { if (V.d) V.d.meta = j.meta; desenhar(); aviso('🎯 Meta salva.'); } else aviso('⚠️ ' + ((j && j.erro) || 'Não deu.')); }).catch(function (e) { aviso('⚠️ ' + e.message); }); } return; }
    var i = t.closest('[data-vd-ideia]');
    if (i) { ev.stopPropagation(); var ideia = prompt('Descreva a promoção (ex.: brinde de cuba inox para quem fechar cozinha até 20/12):'); if (ideia && ideia.trim().length >= 8) acao(i, 'promo_ideia', '', ideia.trim()); }
  }, true);

  var orig = window.renderDashboard;
  if (typeof orig === 'function') {
    window.renderDashboard = function () {
      var r = orig.apply(this, arguments);
      try { desenhar(); } catch (e) { console.error('vendas', e); }
      carregar(false);
      return r;
    };
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) carregar(false); });
  setTimeout(function () { carregar(true); }, 2500);
})();
