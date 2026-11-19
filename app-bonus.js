// app-bonus.js — v1: 🏆 Painel de Bonificação da equipe (dados no bot: /bot/bonus)
// Secretária → cartão "Bonificação da equipe" → quanto pagar no mês (confirmado e previsto), cada funcionário com a semana,
// as semanas do mês, a carreira e o detalhe do pagamento; regras completas (pontos, níveis, faixas, meta, prêmio) e registrar o pagamento.
(function () {
  'use strict';
  if (window.__hrBonus) return; window.__hrBonus = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { return 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function pt(v) { return String(Math.round((Number(v) || 0) * 10) / 10).replace('.', ','); }
  function br(iso) { var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] : '—'; }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  function hojeMes() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 7); }
  function somaMes(m, d) { var y = +m.slice(0, 4), mo = +m.slice(5) - 1 + d; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + '-' + String(mo + 1).padStart(2, '0'); }
  var ST = { caminho: ['No caminho', '52,211,153'], coringa: ['Usou o coringa', '232,165,48'], fora: ['Fora do prêmio', '248,113,113'], sem: ['Sem produção', '154,145,126'] };
  var st = { mes: hojeMes(), d: null, aberto: {} };

  var CSS = '#hrBon{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:bonEntra .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrBon::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 50% at 90% -10%,rgba(201,168,76,.18),transparent 60%)}#hrBon>*{position:relative}#hrBon *{box-sizing:border-box}'
    + '@keyframes bonEntra{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes bonUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    + '.bon-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.bon-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.bon-sub{font-size:.72rem;color:#9a917e}'
    + '.bon-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 8px}'
    + '.bon-body{flex:1;overflow-y:auto;padding:12px 12px 90px}'
    + '.bon-mes{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.bon-mes b{font-size:1.05rem;color:#f0d78c}'
    + '.bon-hero{border-radius:18px;padding:16px;background:linear-gradient(135deg,rgba(201,168,76,.22),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.35);margin-bottom:10px;animation:bonUp .35s both}'
    + '.bon-hero small{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#c9b98e}.bon-hero .v{font-size:2rem;font-weight:800;color:#f6e3a6;margin:2px 0}'
    + '.bon-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.bon-kpi{border-radius:14px;padding:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}'
    + '.bon-kpi b{display:block;font-size:1.05rem;color:#f0d78c}.bon-kpi span{font-size:.6rem;letter-spacing:.06em;text-transform:uppercase;color:#9a917e}'
    + '.bon-card{border-radius:16px;padding:13px;margin-bottom:10px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07);animation:bonUp .35s both}'
    + '.bon-l1{display:flex;align-items:center;gap:10px}.bon-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);flex:none}'
    + '.bon-nm{font-weight:800;font-size:1rem}.bon-fn{font-size:.7rem;color:#9a917e}.bon-pg{margin-left:auto;text-align:right}.bon-pg b{display:block;color:#7ee2a8;font-size:1.05rem}.bon-pg span{font-size:.62rem;color:#9a917e}'
    + '.bon-st{display:inline-block;font-size:.66rem;font-weight:700;border-radius:10px;padding:2px 8px;margin-top:8px}'
    + '.bon-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.07);margin-top:9px;overflow:hidden;position:relative}.bon-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#c9a84c,#f0d78c);transition:width .8s}'
    + '.bon-mk{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(255,255,255,.35)}'
    + '.bon-row{display:flex;justify-content:space-between;gap:8px;font-size:.78rem;color:#c9bfa6;margin-top:6px}'
    + '.bon-sems{display:flex;gap:5px;margin-top:9px}.bon-sems div{flex:1;border-radius:9px;padding:5px 2px;text-align:center;font-size:.62rem;line-height:1.25}'
    + '.bon-det{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.1);font-size:.78rem}.bon-det h4{margin:10px 0 4px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#c9a84c}'
    + '.bon-tf{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}.bon-tf b{color:#f0d78c}'
    + '.bon-sec{border-radius:16px;padding:13px;margin:14px 0 10px;background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.2)}.bon-sec summary{font-weight:800;color:#f0d78c;cursor:pointer;list-style:none}'
    + '.bon-rg{display:grid;grid-template-columns:auto 1fr;gap:5px 10px;font-size:.78rem;margin-top:8px}.bon-rg b{color:#efe9dc;font-weight:600}.bon-rg span{color:#c9bfa6}'
    + '.bon-p{font-size:.8rem;color:#c9bfa6;line-height:1.45;margin:8px 0}'
    + '.bon-bt{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-size:.95rem;margin-top:6px;cursor:pointer}'
    + '.bon-bt[disabled]{opacity:.45}.bon-ok{border-radius:14px;padding:12px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.35);color:#9ff0c6;font-size:.82rem;margin:6px 0}'
    + '.bon-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(201,168,76,.14),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.3);color:#efe9dc;cursor:pointer}'
    + '.bon-card-sec .ic{font-size:1.5rem}.bon-card-sec .t{font-weight:800}.bon-card-sec .s{font-size:.72rem;color:#9a917e}';
  function css() { if (document.getElementById('hrBonCss')) return; var s = document.createElement('style'); s.id = 'hrBonCss'; s.textContent = CSS; document.head.appendChild(s); }

  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Erro ' + r.status); return j; });
    });
  }
  function carregar() {
    var b = document.getElementById('bonBody'); if (b) b.innerHTML = '<div class="bon-p" style="text-align:center;padding:40px 0">Calculando os pontos da equipe…</div>';
    return api('/bot/bonus?mes=' + st.mes).then(function (d) { st.d = d; desenhar(); }).catch(function (e) { if (b) b.innerHTML = '<div class="bon-p">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function rg(l) { return '<div class="bon-rg">' + l.map(function (r) { return '<b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span>'; }).join('') + '</div>'; }
  function cartaoFunc(x, i) {
    var s = ST[x.mes.st] || ST.sem, sem = x.semana, aberto = st.aberto[x.id], d = st.d;
    var valor = d.fechado ? x.pagar.total : x.previsto.total;
    var h = '<div class="bon-card" style="animation-delay:' + (i * 0.05) + 's" data-f="' + esc(x.id) + '"><div class="bon-l1"><div class="bon-av">' + esc(x.carreira.ico) + '</div><div style="min-width:0"><div class="bon-nm">' + esc(x.nome) + '</div><div class="bon-fn">' + esc(x.carreira.nome) + ' · ' + pt(x.carreira.xp) + ' pts na carreira' + (x.funcoes.length ? ' · ' + esc(x.funcoes.join(', ')) : '') + '</div></div>'
      + '<div class="bon-pg"><b>' + brl(valor) + '</b><span>' + (d.fechado ? 'a pagar' : 'previsto') + '</span></div></div>';
    h += '<span class="bon-st" style="background:rgba(' + s[1] + ',.15);color:rgb(' + s[1] + ');border:1px solid rgba(' + s[1] + ',.4)">' + s[0] + '</span> <span class="bon-fn">' + esc(x.mes.txt) + '</span>';
    if (sem) {
      var pc = Math.min(150, sem.pts / Math.max(1, sem.meta) * 100);
      h += '<div class="bon-row"><span>Esta semana: <b style="color:#f0d78c">' + pt(sem.pts) + ' de ' + pt(sem.meta) + '</b> (' + sem.pct + '%) ' + (sem.faixa ? sem.faixa.ico : '') + '</span><span>' + (sem.pos ? sem.pos + 'º lugar' : '') + '</span></div>'
        + '<div class="bon-bar"><i style="width:' + (pc / 1.5) + '%"></i><span class="bon-mk" style="left:' + (80 / 1.5) + '%"></span><span class="bon-mk" style="left:' + (100 / 1.5) + '%"></span><span class="bon-mk" style="left:' + (125 / 1.5) + '%"></span></div>'
        + '<div class="bon-row" style="font-size:.66rem;color:#857b66"><span>🥉80%</span><span>🥈100%</span><span>🥇125%</span><span>💎150%</span></div>'
        + '<div class="bon-row" style="font-size:.72rem"><span>' + (sem.falta > 0 ? 'Faltam ' + pt(sem.falta) + ' para a meta' + (sem.diasRest ? ' (~' + sem.porDia + '/dia)' : '') : '🎯 Meta batida') + '</span><span>' + (sem.auto ? 'meta automática' : 'meta fixa') + '</span></div>';
    }
    h += '<div class="bon-sems">' + x.mes.semanas.map(function (w) {
      var bg = w.futura ? 'rgba(255,255,255,.04)' : w.bateu ? 'rgba(52,211,153,.2)' : w.atual ? 'rgba(201,168,76,.2)' : 'rgba(248,113,113,.18)';
      return '<div style="background:' + bg + '"><b>' + br(w.ini) + '</b><br>' + (w.futura ? '—' : pt(w.pts) + '/' + pt(w.meta)) + '<br>' + (w.futura ? '⬜' : w.bateu ? '✅' : w.atual ? '⏳' : '❌') + '</div>';
    }).join('') + '</div>';
    if (aberto) {
      var P = d.fechado ? x.pagar : x.previsto;
      h += '<div class="bon-det"><h4>💰 Pagamento ' + (d.fechado ? 'do mês' : 'previsto') + '</h4>'
        + '<div class="bon-tf"><span>Prêmio do mês</span><b>' + brl(P.premio) + '</b></div>'
        + (d.premio.lider ? '<div class="bon-tf"><span>Líder do mês' + (x.mes.lider ? ' 👑' : '') + '</span><b>' + brl(P.lider) + '</b></div>' : '')
        + '<div class="bon-tf"><span>Bônus semanal' + (x.bonusSemana ? ' (' + brl(x.bonusSemana) + ' por semana batida)' : ' (não definido)') + '</span><b>' + brl(P.bonusSemanas) + '</b></div>'
        + '<div class="bon-tf"><span><b style="color:#efe9dc">Total</b></span><b style="color:#7ee2a8">' + brl(P.total) + '</b></div>'
        + '<div class="bon-p">Mês: ' + pt(x.mes.somaP) + ' de ' + pt(x.mes.somaM) + ' pontos (' + x.mes.pct + '%).' + (x.mes.falta ? ' Para compensar o coringa: faltam ' + pt(x.mes.falta) + '.' : '') + (x.metaFixa ? ' Meta fixa: ' + x.metaFixa + ' pontos por semana.' : '') + '</div>';
      if (sem && sem.tarefas && sem.tarefas.length) h += '<h4>✅ Pontos desta semana</h4>' + sem.tarefas.map(function (t) { return '<div class="bon-tf"><span>' + esc(t.tipo) + ' · ' + esc(t.nome) + ' <small style="color:#857b66">' + br(t.dia) + '</small></span><b>' + (t.pts > 0 ? '+' : '') + pt(t.pts) + '</b></div>'; }).join('');
      if (sem && sem.medalhas && sem.medalhas.length) h += '<h4>🏅 Medalhas</h4><div class="bon-p">' + sem.medalhas.map(function (m) { return esc(m.i + ' ' + m.t); }).join(' · ') + '</div>';
      var K = x.carreira; h += '<h4>🎖️ Carreira</h4><div class="bon-p">' + esc(K.ico + ' ' + K.nome) + ' · ' + pt(K.xp) + ' pontos' + (K.prox ? ' · próximo: ' + esc(K.prox.ico + ' ' + K.prox.nome) + ' em ' + K.prox.faltam + ' pontos (' + K.pctProx + '%)' : ' · nível máximo') + '</div></div>';
    }
    h += '<div class="bon-fn" style="text-align:center;margin-top:8px">' + (aberto ? '▲ menos' : '▼ ver detalhes') + '</div></div>';
    return h;
  }
  function desenhar() {
    var d = st.d, b = document.getElementById('bonBody'); if (!d || !b) return;
    var ano = d.mes.slice(0, 4), nm = MESES[+d.mes.slice(5) - 1];
    var ativos = d.funcionarios.filter(function (x) { return x.mes.st !== 'sem'; }), caminho = d.funcionarios.filter(function (x) { return x.mes.st === 'caminho' || x.mes.st === 'coringa'; });
    document.getElementById('bonSub').textContent = d.fechado ? 'Mês fechado · valores finais' : 'Mês em andamento · atualiza a cada tarefa';
    var h = '<div class="bon-mes"><button class="bon-ic" data-a="ant">‹</button><b>' + nm + ' ' + ano + '</b><button class="bon-ic" data-a="prox"' + (d.mes >= hojeMes() ? ' disabled style="opacity:.3"' : '') + '>›</button></div>'
      + '<div class="bon-hero"><small>' + (d.fechado ? 'Total a pagar no mês' : 'Previsão de pagamento do mês') + '</small><div class="v">' + brl(d.fechado ? d.totais.pagar : d.totais.previsto) + '</div><div class="bon-fn">' + (d.fechado ? 'Prêmios, líder e bônus semanais de quem bateu as metas.' : 'Se todos que estão no caminho fecharem o mês batendo a meta. Máximo possível: ' + brl(d.totais.maximo) + '.') + '</div></div>'
      + '<div class="bon-kpis"><div class="bon-kpi"><b>' + brl(d.premio.valor) + '</b><span>prêmio por pessoa</span></div><div class="bon-kpi"><b>' + (d.premio.lider ? brl(d.premio.lider) : '—') + '</b><span>extra do líder</span></div><div class="bon-kpi"><b>' + caminho.length + '/' + ativos.length + '</b><span>no caminho</span></div></div>';
    if (d.pago) h += '<div class="bon-ok">✅ Pagamentos deste mês registrados em ' + new Date(d.pago.em).toLocaleDateString('pt-BR') + ': ' + d.pago.itens.map(function (i) { return esc(i.nome) + ' ' + brl(i.valor); }).join(' · ') + '. Entram no RH (Bônus) e em Finanças.</div>';
    else if (d.fechado && d.totais.pagar > 0) h += '<button class="bon-bt" data-a="pagar">💸 Registrar pagamento de ' + brl(d.totais.pagar) + '</button><div class="bon-fn" style="text-align:center;margin:4px 0 10px">Lança cada valor no RH (tipo Bônus) e em Finanças.</div>';
    var lista = d.funcionarios.slice().sort(function (a, b) { return (b.previsto.total - a.previsto.total) || ((b.semana ? b.semana.pct : 0) - (a.semana ? a.semana.pct : 0)); });
    h += lista.map(cartaoFunc).join('');
    var R = d.regras;
    h += '<details class="bon-sec" open><summary>📖 Como funciona a bonificação</summary><div class="bon-p">' + esc(R.premio) + '</div><div class="bon-p">' + esc(R.meta) + '</div></details>'
      + '<details class="bon-sec"><summary>⭐ Quanto vale cada tarefa</summary>' + rg(R.pontos) + '</details>'
      + '<details class="bon-sec"><summary>🎚️ Nível do serviço (multiplica os pontos)</summary>' + rg(R.niveis) + '<div class="bon-p">Serviço com mais detalhes e peças maiores sobe de nível. No corte o nível conta pela metade.</div></details>'
      + '<details class="bon-sec"><summary>🏅 Faixas da semana</summary>' + rg(R.faixas) + '<div class="bon-p">Cada faixa é comemorada no WhatsApp do funcionário; Ouro e Diamante são anunciados para a equipe.</div></details>'
      + '<details class="bon-sec"><summary>🎖️ Carreira</summary>' + rg(R.carreira) + '<div class="bon-p">Os pontos de todas as semanas se acumulam. Ao subir de nível, o funcionário, a equipe e o senhor são avisados.</div></details>'
      + '<details class="bon-sec"><summary>💬 Como mudar pelo WhatsApp</summary><div class="bon-p">' + R.comandos.map(esc).join('<br>') + '</div></details>';
    b.innerHTML = h;
  }
  function abrir() {
    css(); var v = document.getElementById('hrBon'); if (v) v.remove();
    var d = document.createElement('div'); d.id = 'hrBon';
    d.innerHTML = '<div class="bon-top"><button class="bon-ic" data-a="sair">←</button><div style="flex:1;"><b>🏆 Bonificação da equipe</b><div class="bon-sub" id="bonSub">Carregando…</div></div><button class="bon-ic" data-a="rec">⟳</button></div><div class="bon-body" id="bonBody"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'), c = e.target.closest('[data-f]');
      if (a) { var k = a.getAttribute('data-a');
        if (k === 'sair') { d.remove(); return; }
        if (k === 'rec') { carregar(); return; }
        if (k === 'ant') { st.mes = somaMes(st.mes, -1); carregar(); return; }
        if (k === 'prox') { if (st.mes < hojeMes()) { st.mes = somaMes(st.mes, 1); carregar(); } return; }
        if (k === 'pagar') { if (!confirm('Registrar o pagamento de ' + brl(st.d.totais.pagar) + ' em bônus deste mês?')) return; a.disabled = true;
          api('/bot/bonus/pagar', { mes: st.mes }).then(function (r) { aviso('✅ ' + r.itens.length + ' pagamento(s) registrados: ' + brl(r.total)); carregar(); }).catch(function (er) { a.disabled = false; aviso('⚠️ ' + er.message); }); return; }
      }
      if (c) { var id = c.getAttribute('data-f'); st.aberto[id] = !st.aberto[id]; desenhar(); }
    });
    carregar();
  }
  // cartão na Secretária (abaixo das Garantias)
  function cartao() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-bon-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'bon-card-sec'; b.setAttribute('data-bon-btn', '1');
    b.innerHTML = '<span class="ic">🏆</span><div style="flex:1;"><div class="t">Bonificação da equipe</div><div class="s">Metas, pontos, prêmio do mês e quanto pagar</div></div><span style="color:#c9a84c;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-gar-btn]') || sb.querySelector('[data-conv-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.insertBefore(b, sb.firstChild);
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartao(); new MutationObserver(cartao).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirBonificacao = abrir;
})();
