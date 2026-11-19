// app-desempenho.js — v1: 📊 Desempenho da equipe (dados no bot: /bot/desempenho)
// Secretária → cartão "Desempenho da equipe": horário (ponto), tempo de cada tarefa, velocidade × qualidade,
// quanto cada um gera em serviço comparado ao salário e se merece aumento. Os salários vêm do RH do app.
(function () {
  'use strict';
  if (window.__hrDesemp) return; window.__hrDesemp = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { return 'R$ ' + Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function n1(v) { return String(Math.round((Number(v) || 0) * 10) / 10).replace('.', ','); }
  function hh(m) { if (m == null) return '—'; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0'); }
  function dur(m) { m = Math.round(m || 0); if (m < 60) return m + ' min'; var h = Math.floor(m / 60), r = m % 60; return h + 'h' + (r ? String(r).padStart(2, '0') : ''); }
  function pct(a, b) { return (a != null && b) ? Math.round((a - b) / b * 100) : null; }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  var ET = { corte: '✂️ Corte', acabamento: '🪨 Acabamento', fabricacao: '🛠️ Fabricação', instalacao: '🔧 Instalação/entrega' };
  var st = { dias: 30, d: null, aberto: {} };

  var CSS = '#hrDsm{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit;animation:dsmIn .3s cubic-bezier(.2,.9,.25,1)}'
    + '#hrDsm::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 50% at 10% -10%,rgba(96,165,250,.14),transparent 60%)}#hrDsm>*{position:relative}#hrDsm *{box-sizing:border-box}'
    + '@keyframes dsmIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes dsmUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    + '.dsm-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.dsm-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.dsm-sub{font-size:.72rem;color:#9a917e}'
    + '.dsm-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 8px}'
    + '.dsm-body{flex:1;overflow-y:auto;padding:12px 12px 90px}'
    + '.dsm-chips{display:flex;gap:6px;margin-bottom:10px}.dsm-chip{flex:1;padding:9px 0;border-radius:12px;border:1px solid rgba(201,168,76,.25);background:rgba(255,255,255,.03);color:#c9bfa6;font-weight:700;font-size:.8rem;cursor:pointer}'
    + '.dsm-chip.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border-color:transparent}'
    + '.dsm-hero{border-radius:18px;padding:16px;background:linear-gradient(135deg,rgba(201,168,76,.22),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.35);margin-bottom:10px;animation:dsmUp .35s both}'
    + '.dsm-hero small{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#c9b98e}.dsm-hero .v{font-size:1.9rem;font-weight:800;color:#f6e3a6;margin:2px 0}'
    + '.dsm-card{border-radius:16px;padding:13px;margin-bottom:10px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07);animation:dsmUp .35s both;cursor:pointer}'
    + '.dsm-l1{display:flex;align-items:center;gap:10px}.dsm-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);color:#f0d78c;flex:none}'
    + '.dsm-nm{font-weight:800;font-size:1rem}.dsm-fn{font-size:.7rem;color:#9a917e}.dsm-rt{margin-left:auto;text-align:right}.dsm-rt b{display:block;font-size:1.15rem}.dsm-rt span{font-size:.6rem;color:#9a917e}'
    + '.dsm-v{display:inline-block;font-size:.7rem;font-weight:700;border-radius:10px;padding:3px 9px;margin-top:9px}'
    + '.dsm-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.dsm-kp div{border-radius:11px;padding:8px;background:rgba(255,255,255,.035);text-align:center}.dsm-kp b{display:block;font-size:.95rem;color:#f0d78c}.dsm-kp span{font-size:.58rem;color:#9a917e;text-transform:uppercase;letter-spacing:.04em}'
    + '.dsm-bar{height:9px;border-radius:6px;background:rgba(255,255,255,.07);margin-top:6px;overflow:hidden;position:relative}.dsm-bar i{display:block;height:100%;border-radius:6px;transition:width .8s}'
    + '.dsm-mk{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(255,255,255,.55)}'
    + '.dsm-row{display:flex;justify-content:space-between;gap:8px;font-size:.78rem;color:#c9bfa6;margin-top:6px}.dsm-row b{color:#efe9dc;font-weight:600}'
    + '.dsm-det{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.1);font-size:.78rem}.dsm-det h4{margin:10px 0 4px;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:#c9a84c}'
    + '.dsm-up{color:#7ee2a8}.dsm-dn{color:#f87171}.dsm-eq{color:#9a917e}'
    + '.dsm-sec{border-radius:16px;padding:13px;margin:14px 0 10px;background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.2)}.dsm-sec summary{font-weight:800;color:#f0d78c;cursor:pointer;list-style:none}'
    + '.dsm-p{font-size:.8rem;color:#c9bfa6;line-height:1.45;margin:8px 0}'
    + '.dsm-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(96,165,250,.13),rgba(96,165,250,.03));border:1px solid rgba(96,165,250,.3);color:#efe9dc;cursor:pointer}'
    + '.dsm-card-sec .ic{font-size:1.5rem}.dsm-card-sec .t{font-weight:800}.dsm-card-sec .s{font-size:.72rem;color:#9a917e}';
  function css() { if (document.getElementById('hrDsmCss')) return; var s = document.createElement('style'); s.id = 'hrDsmCss'; s.textContent = CSS; document.head.appendChild(s); }

  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Erro ' + r.status); return j; });
    });
  }
  // salários do RH do app → bot (para calcular se cada um se paga)
  function salariosRH() {
    var raw = {}; try { raw = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) {}
    var lista = Array.isArray(raw) ? raw : Object.keys(raw).map(function (k) { var f = raw[k]; if (f && f.id == null) f.id = k; return f; });
    var out = {}, n = 0; lista.forEach(function (f) { var v = parseFloat(f && f.salario) || 0; if (f && f.ativo !== false && !f.socio && v > 100) { out[String(f.id)] = v; n++; } });
    return n ? out : null;
  }
  function admissoesRH() { // v2: data de admissão → a carreira de pontos começa pelo tempo de casa
    var raw = {}; try { raw = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) {}
    var lista = Array.isArray(raw) ? raw : Object.keys(raw).map(function (k) { var f = raw[k]; if (f && f.id == null) f.id = k; return f; });
    var out = {}, n = 0; lista.forEach(function (f) { if (f && f.ativo !== false && /^\d{4}-\d{2}-\d{2}/.test(String(f.admissao || ''))) { out[String(f.id)] = String(f.admissao).slice(0, 10); n++; } });
    return n ? out : null;
  }
  function seta(a, b, menor) {
    var v = pct(a, b); if (v == null || !isFinite(v)) return '';
    if (Math.abs(v) < 3) return ' <span class="dsm-eq">= igual</span>';
    var bom = menor ? v < 0 : v > 0;
    return ' <span class="' + (bom ? 'dsm-up' : 'dsm-dn') + '">' + (bom ? '▲ ' : '▼ ') + Math.abs(v) + '%' + (menor ? (v < 0 ? ' mais rápido' : ' mais lento') : '') + '</span>';
  }
  function cor(v) { return /^✅/.test(v) ? '52,211,153' : /^🟡/.test(v) ? '232,165,48' : '248,113,113'; }
  function cartao(x) {
    var av = x.aumento || { veredito: '', criterios: [] }, ab = !!st.aberto[x.id], ret = x.retorno, mult = x.mult || 3;
    var rc = ret == null ? '154,145,126' : ret >= mult ? '52,211,153' : ret >= 1 ? '232,165,48' : '248,113,113';
    var h = '<div class="dsm-card" data-f="' + esc(x.id) + '"><div class="dsm-l1"><div class="dsm-av">' + esc(String(x.nome || '?').slice(0, 1)) + '</div><div><div class="dsm-nm">' + esc(x.nome) + '</div><div class="dsm-fn">' + n1(x.pts) + ' pts · ' + x.tarefas + ' tarefa(s)</div></div>'
      + '<div class="dsm-rt"><b style="color:rgb(' + rc + ')">' + (ret == null ? '—' : n1(ret) + '×') + '</b><span>retorno do salário</span></div></div>'
      + '<span class="dsm-v" style="background:rgba(' + cor(av.veredito) + ',.13);color:rgb(' + cor(av.veredito) + ')">' + esc(av.veredito || '') + '</span>'
      + '<div class="dsm-kp"><div><b>' + (x.ptsHora != null ? n1(x.ptsHora) : '—') + '</b><span>pts por hora</span></div><div><b>' + hh(x.entMed) + '</b><span>chega</span></div><div><b>' + (x.dias ? x.atrasos : '—') + '</b><span>atrasos</span></div></div>';
    if (x.salario) { var w = Math.min(100, ret / (mult * 1.6) * 100), mk = Math.min(100, mult / (mult * 1.6) * 100);
      h += '<div class="dsm-row"><span>Gerou <b>' + brl(x.receita) + '</b></span><span>Salário do período <b>' + brl(x.custo) + '</b></span></div><div class="dsm-bar"><i style="width:' + w + '%;background:rgb(' + rc + ')"></i><div class="dsm-mk" style="left:' + mk + '%"></div></div>';
    } else h += '<div class="dsm-row"><span>Gerou <b>' + brl(x.receita) + '</b></span><span style="color:#e8a530">salário não cadastrado no RH</span></div>';
    if (ab) {
      h += '<div class="dsm-det"><h4>⏰ Horário</h4>' + (x.dias ? '<div class="dsm-row"><span>Dias trabalhados</span><b>' + x.dias + '</b></div><div class="dsm-row"><span>Horas</span><b>' + n1(x.horas) + ' h</b></div><div class="dsm-row"><span>Chega / sai (média)</span><b>' + hh(x.entMed) + ' · ' + hh(x.saiMed) + '</b></div><div class="dsm-row"><span>Atrasos (+10 min)</span><b>' + x.atrasos + (x.antes && x.antes.dias ? ' <span class="dsm-eq">(antes ' + x.antes.atrasos + ')</span>' : '') + '</b></div>' : '<div class="dsm-p">Sem registro de ponto no período.</div>');
      h += '<h4>⏱️ Tempo de cada tarefa</h4>';
      var ks = Object.keys(x.tempos || {}); if (!ks.length) h += '<div class="dsm-p">Sem tarefas com tempo medido.</div>';
      ks.forEach(function (k) { var t = x.tempos[k], t0 = x.antes && x.antes.tempos && x.antes.tempos[k]; h += '<div class="dsm-row"><span>' + (ET[k] || k) + ' <span class="dsm-eq">(' + t.n + ')</span></span><b>' + dur(t.med) + ' · ' + t.minPt + ' min/pt' + (t0 ? seta(t.minPt, t0.minPt, true) : '') + '</b></div>'; });
      var tp = x.noPrazo + x.atraso;
      h += '<h4>⭐ Qualidade</h4><div class="dsm-row"><span>Nota dos clientes</span><b>' + (x.nota != null ? n1(x.nota) + ' (' + x.nAval + ')' : '—') + '</b></div><div class="dsm-row"><span>Retrabalhos</span><b>' + x.retrab + '</b></div><div class="dsm-row"><span>No prazo</span><b>' + (tp ? Math.round(x.noPrazo / tp * 100) + '%' : '—') + '</b></div>' + (x.perdas ? '<div class="dsm-row"><span>Perdas/quebras</span><b>' + brl(x.perdas) + '</b></div>' : '');
      h += '<h4>📈 Produção</h4><div class="dsm-row"><span>Pontos por hora</span><b>' + (x.ptsHora != null ? n1(x.ptsHora) : '—') + (x.antes && x.antes.ptsHora ? seta(x.ptsHora, x.antes.ptsHora) : '') + '</b></div><div class="dsm-row"><span>Pontos por semana</span><b>' + n1(x.ptsSem) + ' <span class="dsm-eq">meta ' + x.metaSem + '</span></b></div>';
      h += '<h4>💼 Merece aumento?</h4>' + (av.criterios || []).map(function (c) { return '<div class="dsm-row"><span>' + (c.ok ? '✅' : '❌') + ' ' + esc(c.txt) + '</span></div>'; }).join('') + '</div>';
    } else h += '<div class="dsm-fn" style="text-align:center;margin-top:8px">toque para ver tudo</div>';
    return h + '</div>';
  }
  function desenhar() {
    var b = document.getElementById('dsmBody'), d = st.d; if (!b || !d) return;
    var sub = document.getElementById('dsmSub'); if (sub) sub.textContent = 'Últimos ' + d.dias + ' dias · comparado com os ' + d.dias + ' anteriores';
    var l = (d.func || []).slice().sort(function (a, c) { return (c.retorno || 0) - (a.retorno || 0) || (c.pts - a.pts); });
    var rec = l.reduce(function (t, x) { return t + (x.receita || 0); }, 0), cus = l.reduce(function (t, x) { return t + (x.custo || 0); }, 0);
    var h = '<div class="dsm-chips">' + [7, 30, 90].map(function (n) { return '<button class="dsm-chip' + (st.dias === n ? ' on' : '') + '" data-d="' + n + '">' + (n === 7 ? '7 dias' : n === 30 ? '30 dias' : '90 dias') + '</button>'; }).join('') + '</div>';
    h += '<div class="dsm-hero"><small>A equipe gerou em serviços</small><div class="v">' + brl(rec) + '</div><div class="dsm-fn">' + (cus ? 'Salários do período ' + brl(cus) + ' → <b style="color:#f6e3a6">' + n1(rec / cus) + '×</b> (referência ' + (d.mult || 3) + '×)' : 'Cadastre os salários no RH para ver o retorno.') + '</div></div>';
    h += l.length ? l.map(cartao).join('') : '<div class="dsm-p" style="text-align:center;padding:30px 0">Ainda não há produção nem ponto neste período.</div>';
    h += '<details class="dsm-sec" open><summary>📖 Como ler</summary>'
      + '<div class="dsm-p"><b>Tempo de cada tarefa:</b> horas de expediente desde que a tarefa chegou para ele até terminar (sem noites, domingos e almoço). <b>Min/pt</b> divide pelo tamanho do serviço: quanto menor, mais rápido.</div>'
      + '<div class="dsm-p"><b>Gerou:</b> o valor de cada pedido dividido pelos pontos de quem trabalhou nele. <b>Retorno:</b> quanto gerou ÷ salário do período (contando os dias trabalhados). A marca na barra é a referência; abaixo de 1× ele não está pagando o próprio salário.</div>'
      + '<div class="dsm-p"><b>Aumento:</b> produção na meta, qualidade (no máximo 1 retrabalho, nota 4,5+), pontualidade (até 10% de atrasos), retorno acima da referência e sem piorar o ritmo. Olhe os 90 dias. A decisão é sua.</div>'
      + '<div class="dsm-p"><b>Mais rápido com qualidade:</b> todo sábado cada um recebe no WhatsApp a própria evolução. Quem bate o próprio recorde sem retrabalho ganha +3 na carreira; velocidade com retrabalho não conta.</div>'
      + '<div class="dsm-p">Pelo WhatsApp: <i>desempenho</i>, <i>desempenho do Gibson</i>, <i>quem merece aumento</i>, <i>referência de retorno 4x</i>.</div></details>';
    b.innerHTML = h;
  }
  function carregar() {
    var b = document.getElementById('dsmBody'); if (b) b.innerHTML = '<div class="dsm-p" style="text-align:center;padding:40px 0">Analisando ponto, tarefas e qualidade…</div>';
    var sal = salariosRH();
    var adm = admissoesRH();
    return (sal || adm ? api('/bot/desempenho/salarios', { sal: sal || {}, adm: adm || undefined }).catch(function () {}) : Promise.resolve())
      .then(function () { return api('/bot/desempenho?dias=' + st.dias); })
      .then(function (d) { st.d = d; desenhar(); }).catch(function (e) { if (b) b.innerHTML = '<div class="dsm-p">⚠️ ' + esc(e.message) + '</div>'; });
  }
  function abrir() {
    css(); var v = document.getElementById('hrDsm'); if (v) v.remove();
    var d = document.createElement('div'); d.id = 'hrDsm';
    d.innerHTML = '<div class="dsm-top"><button class="dsm-ic" data-a="sair">←</button><div style="flex:1;"><b>📊 Desempenho da equipe</b><div class="dsm-sub" id="dsmSub">Carregando…</div></div><button class="dsm-ic" data-a="rec">⟳</button></div><div class="dsm-body" id="dsmBody"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'), c = e.target.closest('[data-f]'), ch = e.target.closest('[data-d]');
      if (a) { var k = a.getAttribute('data-a'); if (k === 'sair') { d.remove(); return; } if (k === 'rec') { carregar(); return; } }
      if (ch) { st.dias = +ch.getAttribute('data-d'); carregar(); return; }
      if (c) { var id = c.getAttribute('data-f'); st.aberto[id] = !st.aberto[id]; desenhar(); }
    });
    carregar();
  }
  function cartaoSec() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-dsm-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dsm-card-sec'; b.setAttribute('data-dsm-btn', '1');
    b.innerHTML = '<span class="ic">📊</span><div style="flex:1;"><div class="t">Desempenho da equipe</div><div class="s">Horários, tempo de cada tarefa, qualidade, se paga o salário e aumento</div></div><span style="color:#60a5fa;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-bon-btn]') || sb.querySelector('[data-gar-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.appendChild(b);
  }
  function syncRH() { // v2: manda salário e admissão ao bot uma vez por dia (carreira pelo tempo de casa)
    try { var hoje = new Date().toISOString().slice(0, 10); if (localStorage.getItem('hr_dsm_sync') === hoje) return; var sal = salariosRH(), adm = admissoesRH(); if (!base() || (!sal && !adm)) return;
      api('/bot/desempenho/salarios', { sal: sal || {}, adm: adm || undefined }).then(function () { try { localStorage.setItem('hr_dsm_sync', hoje); } catch (e) {} }).catch(function () {}); } catch (e) {}
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartaoSec(); new MutationObserver(cartaoSec).observe(sb, { childList: true }); setTimeout(syncRH, 8000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirDesempenho = abrir;
})();
