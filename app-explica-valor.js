// app-explica-valor.js — v1 (28/11/2026): TELA "💡 ENTENDA O VALOR"
// Explica ao cliente (e ao Sr. Hangel, para estudar) por que o projeto não é "m² do projeto × preço do m² da pedra":
//   • para onde vai cada real (pedra × acabamentos e serviços), com as linhas do próprio Resultado;
//   • a pedra vem em chapa inteira (área das peças × chapa usada);
//   • por que não dá para comparar com o m² do depósito;
//   • o quadro "O que está incluso".
// Modo cliente (padrão) nunca mostra custo, margem ou perda. "🔒 Visão interna" mostra custo, margem e o valor por m² do projeto pronto.
(function () {
  'use strict';
  var CH_W = 3.0, CH_H = 1.6, CH_M2 = CH_W * CH_H;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { try { return 'R$ ' + fm(v); } catch (e) { return 'R$ ' + (Math.round(v * 100) / 100).toFixed(2).replace('.', ','); } }
  function m2t(v) { return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' m²'; }
  function num(t) { var m = String(t || '').match(/R\$\s*([\d.]+,\d{2}|[\d.]+)/); if (!m) return 0; var x = m[1]; return x.indexOf(',') >= 0 ? parseFloat(x.replace(/\./g, '').replace(',', '.')) : parseFloat(x); }
  function limpa(t) { return String(t || '').replace(/^Recorte 45°/, 'Sainha 45°').replace(/^Reto\b/, 'Frontão reto').replace(/\s+/g, ' ').trim(); }

  // Linhas do "Resultado" (o mesmo que vai no PDF), sem custo/lucro/perda
  function linhas() {
    var rd = document.getElementById('resDetail'); if (!rd) return [];
    var out = [];
    [].slice.call(rd.querySelectorAll('.rrow')).forEach(function (el) {
      if (/^rd/.test(el.id || '')) return;
      var rk = ((el.querySelector('.rk') || {}).textContent || '').trim(), rv = ((el.querySelector('.rv') || {}).textContent || '').trim();
      if (!rk || /(custo|lucro|margem|confer|interno|total m²|parcelado)/i.test(rk)) return;
      if (/m²\s*$/.test(rv)) return; // peça: só medida
      var v = num(rv); if (!(v > 0)) return;
      var pedra = /\s—\s[\d.,]+\s*m²/.test(rk);
      out.push({ l: pedra ? 'Pedra ' + rk.replace(/\s—\s.*$/, '') : limpa(rk), v: v, pedra: pedra });
    });
    return out;
  }
  function inclusos(d) {
    var q = window.pendQ || {}, acN = (q.acN || []).map(function (x) { return /^Garantia de Medidas/i.test(x) ? 'Garantia de medidas' : x; });
    var temInst = acN.some(function (x) { return /instala/i.test(x); }) || linhas().some(function (x) { return /instala/i.test(x.l); });
    var base = [
      'Visita técnica e medição no local',
      'A chapa inteira da pedra escolhida (' + (d.chapas > 1 ? d.chapas + ' chapas' : '1 chapa') + '), com os veios combinados entre as peças',
      'Corte sob medida e polimento de todas as bordas aparentes',
      'Projeto das peças e conferência das medidas antes de cortar'
    ];
    if (temInst) { base.push('Transporte da pedra pronta até a obra'); base.push('Instalação pela nossa equipe, com material de fixação'); }
    base = base.concat(acN); base.push(temInst ? 'Garantia de 12 meses na instalação' : 'Garantia do material e do acabamento até a entrega');
    var vistos = {};
    return base.filter(function (x) { var k = String(x).toLowerCase().slice(0, 18); if (vistos[k]) return false; vistos[k] = 1; return true; });
  }

  function dados() {
    var e = window._orcExplica; if (!e || !(e.vista > 0)) return null;
    var L = linhas(), pedT = e.pedT || L.filter(function (x) { return x.pedra; }).reduce(function (t, x) { return t + x.v; }, 0);
    var servs = L.filter(function (x) { return !x.pedra; });
    var outros = Math.max(0, e.vista - pedT);
    var m2c = e.m2Compra > 0 ? e.m2Compra : e.m2 * 1.1;
    var chapas = Math.max(1, Math.ceil(m2c / CH_M2));
    return { e: e, pedT: pedT, servs: servs, outros: outros, chapas: chapas, m2Chapa: chapas * CH_M2, prM2Proj: e.m2 > 0 ? e.vista / e.m2 : 0 };
  }

  function css() {
    if (document.getElementById('exvCss')) return;
    var s = document.createElement('style'); s.id = 'exvCss';
    s.textContent = '#exvOv{position:fixed;inset:0;z-index:9500;background:#08070a;color:#efe9dc;font-family:Outfit,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch}' +
      '#exvOv .w{max-width:760px;margin:0 auto;padding:18px 16px calc(28px + env(safe-area-inset-bottom))}' +
      '#exvOv h1{font-family:Cormorant Garamond,serif;color:#ecd27c;font-size:1.9rem;line-height:1.1;margin:6px 0 4px;font-weight:600}' +
      '#exvOv h2{font-size:.68rem;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:26px 0 10px;font-weight:800}' +
      '#exvOv .sub{color:#a99c80;font-size:.85rem;line-height:1.5}' +
      '#exvOv .cd{background:#14121a;border:1px solid rgba(201,168,76,.25);border-radius:16px;padding:14px 16px}' +
      '#exvOv .big{font-family:Cormorant Garamond,serif;font-size:2.6rem;color:#f3ddb0;line-height:1;font-weight:700}' +
      '#exvOv .bar{display:flex;height:22px;border-radius:11px;overflow:hidden;margin:10px 0 8px}' +
      '#exvOv .lg{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.86rem}' +
      '#exvOv .lg:last-child{border-bottom:none}#exvOv .lg b{white-space:nowrap;margin-left:10px}' +
      '#exvOv .dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:middle}' +
      '#exvOv .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:520px){#exvOv .g2{grid-template-columns:1fr}}' +
      '#exvOv .por{background:#14121a;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px}' +
      '#exvOv .por .t{font-weight:800;color:#f0d78c;font-size:.9rem;margin-bottom:4px}#exvOv .por .x{color:#bdb19a;font-size:.8rem;line-height:1.5}' +
      '#exvOv .inc{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.88rem;line-height:1.4}#exvOv .inc:last-child{border-bottom:none}' +
      '#exvOv .inc span{color:#5dbf7a;font-weight:900}' +
      '#exvOv .ch{position:relative;background:#2a2620;border:2px solid #6b5a33;border-radius:6px;aspect-ratio:3/1.6;max-height:200px;max-width:375px;margin:0 auto;overflow:hidden}' +
      '#exvOv .ch i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(135deg,#c9a84c,#8a6d2a);opacity:.85}' +
      '#exvOv .btn{border:none;border-radius:12px;padding:11px 14px;font:700 .82rem Outfit,sans-serif;cursor:pointer}' +
      '#exvOv .int{border:1px dashed rgba(224,81,81,.5);background:rgba(224,81,81,.06)}';
    document.head.appendChild(s);
  }

  var interno = false;
  function render(ov) {
    var d = dados();
    var w = ov.querySelector('.w');
    if (!d) { w.innerHTML = '<div class="sub" style="margin-top:40px">Calcule o orçamento primeiro.</div><button class="btn" id="exvX" style="margin-top:16px;background:rgba(255,255,255,.08);color:#efe9dc">Fechar</button>'; w.querySelector('#exvX').onclick = function () { ov.remove(); }; return; }
    var e = d.e, pPed = Math.round(d.pedT / e.vista * 100), pOut = 100 - pPed;
    var pedra = (e.pedras && e.pedras[0]) || {}, multi = e.pedras && e.pedras.length > 1;
    var nomePedra = multi ? e.pedras.map(function (p) { return p.nm; }).join(' + ') : (pedra.nm || 'a pedra escolhida');
    var aproveit = Math.min(100, Math.round(e.m2 / d.m2Chapa * 100));
    var h = '';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
      '<div style="font-size:.62rem;letter-spacing:3px;text-transform:uppercase;color:#a99c80">HR Mármores e Granitos</div>' +
      '<div style="display:flex;gap:6px"><button class="btn" id="exvInt" style="background:' + (interno ? 'rgba(224,81,81,.2)' : 'rgba(255,255,255,.06)') + ';color:' + (interno ? '#ff9b9b' : '#a99c80') + ';padding:8px 10px;font-size:.7rem">🔒 ' + (interno ? 'Interna ligada' : 'Visão interna') + '</button>' +
      '<button class="btn" id="exvX" style="background:rgba(255,255,255,.08);color:#efe9dc;padding:8px 12px">✕</button></div></div>';
    h += '<h1>Como chegamos no valor do seu projeto</h1>';
    h += '<div class="sub">' + (e.cli ? esc(e.cli) + ', ' : '') + 'o valor não é só "metro quadrado de pedra". Veja para onde vai cada real.</div>';

    // 1. Valor
    h += '<h2>O valor do projeto</h2><div class="cd" style="text-align:center">' +
      '<div class="big">' + brl(e.vista) + '</div><div class="sub" style="margin-top:6px">à vista' + (e.parc > e.vista ? ' · ou ' + brl(e.parc) + ' em até 10× no cartão' : '') + '</div></div>';

    // 2. Para onde vai
    h += '<h2>Para onde vai cada real</h2><div class="cd">' +
      '<div class="bar"><div style="width:' + pPed + '%;background:linear-gradient(90deg,#c9a84c,#e8c96a)"></div><div style="width:' + pOut + '%;background:linear-gradient(90deg,#4a7bd0,#6fa0ee)"></div></div>' +
      '<div class="lg"><span><span class="dot" style="background:#e8c96a"></span><b style="margin:0">Pedra</b> · ' + esc(nomePedra) + '</span><b>' + brl(d.pedT) + ' · ' + pPed + '%</b></div>' +
      '<div class="lg"><span><span class="dot" style="background:#6fa0ee"></span><b style="margin:0">Acabamentos e serviços</b></span><b>' + brl(d.outros) + ' · ' + pOut + '%</b></div>' +
      (d.servs.length ? '<div style="margin:6px 0 0 18px">' + d.servs.map(function (x) { return '<div class="lg" style="font-size:.8rem;color:#bdb19a"><span>' + esc(x.l) + '</span><b>' + brl(x.v) + '</b></div>'; }).join('') + '</div>' : '') +
      '</div>';

    // 3. Chapa
    h += '<h2>A pedra vem em chapa inteira</h2><div class="cd">' +
      '<div class="sub" style="margin-bottom:10px">As peças do seu projeto somam <b style="color:#f3ddb0">' + m2t(e.m2) + '</b>, mas a pedra só é vendida em chapa inteira. Para o seu projeto usamos <b style="color:#f3ddb0">' + (d.chapas > 1 ? d.chapas + ' chapas' : '1 chapa') + ' de 3,00 × 1,60 m (' + m2t(d.m2Chapa) + ')</b>.</div>' +
      '<div class="ch"><i style="width:' + aproveit + '%"></i><div style="position:absolute;left:8px;bottom:6px;font-size:.72rem;color:#1a1408;font-weight:800">peças: ' + m2t(e.m2) + '</div><div style="position:absolute;right:8px;bottom:6px;font-size:.72rem;color:#d8cfb8">sobra e recortes</div></div>' +
      '<div class="sub" style="margin-top:10px">✓ O senhor paga a pedra só pela área das peças (' + m2t(e.m2) + '), não pela chapa inteira. A sobra e o risco de quebra no corte ficam por nossa conta.</div></div>';

    // 4. Comparação
    h += '<h2>Por que não dá para comparar com o m² do depósito</h2><div class="g2">' +
      '<div class="por"><div class="t">🪨 Chapa crua × peça pronta</div><div class="x">O m² do depósito é a pedra bruta, sem nenhum corte. O seu projeto chega pronto: cortado, polido e encaixado.</div></div>' +
      '<div class="por"><div class="t">📐 Sainha e frontão</div><div class="x">Cada metro de sainha 45° leva dois cortes em ângulo, colagem e polimento da quina. Não é só "mais pedra".</div></div>' +
      '<div class="por"><div class="t">✂️ Recortes e furos</div><div class="x">Cuba, cooktop e torneira precisam de recorte exato na máquina; um erro perde a peça toda.</div></div>' +
      '<div class="por"><div class="t">🚚 Transporte, instalação e garantia</div><div class="x">Levamos, instalamos com a nossa equipe e respondemos pela obra depois de pronta.</div></div>' +
      '</div>';

    // 5. Incluso
    h += '<h2>O que está incluso</h2><div class="cd">' + inclusos(d).map(function (x) { return '<div class="inc"><span>✓</span><div>' + esc(x) + '</div></div>'; }).join('') + '</div>';

    // 6. Interna
    if (interno) {
      var mg = e.vista - (e.custo || 0), pm = e.vista > 0 ? Math.round(mg / e.vista * 100) : 0;
      h += '<h2 style="color:#ff9b9b">🔒 Visão interna — não mostrar ao cliente</h2><div class="cd int">' +
        '<div class="lg"><span>Preço da pedra (tabela)</span><b>' + (multi ? e.pedras.map(function (p) { return brl(p.pr) + '/m²'; }).join(' · ') : brl(pedra.pr || 0) + '/m²') + '</b></div>' +
        '<div class="lg"><span>Valor por m² do projeto pronto</span><b>' + brl(d.prM2Proj) + '/m²</b></div>' +
        '<div class="lg"><span>Área das peças × chapa usada</span><b>' + m2t(e.m2) + ' de ' + m2t(d.m2Chapa) + ' (' + aproveit + '%)</b></div>' +
        '<div class="lg"><span>Custo da pedra (com perda)</span><b>' + brl(e.custoPedra || 0) + '</b></div>' +
        '<div class="lg"><span>Custo da mão de obra</span><b>' + brl(e.custoMO || 0) + '</b></div>' +
        '<div class="lg"><span>Margem estimada</span><b style="color:' + (pm >= 40 ? '#5dbf7a' : pm >= 25 ? '#f39c12' : '#e05151') + '">' + brl(mg) + ' (' + pm + '%)</b></div>' +
        '<div class="sub" style="margin-top:8px;font-size:.76rem">Para explicar: o cliente compara ' + brl(pedra.pr || 0) + '/m² com ' + brl(d.prM2Proj) + '/m². A diferença são os acabamentos e serviços (' + pOut + '% do valor) e a chapa inteira.</div></div>';
    }
    h += '<div style="text-align:center;margin-top:22px"><button class="btn" id="exvX2" style="background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;min-width:200px">Fechar</button></div>';
    w.innerHTML = h;
    w.querySelector('#exvX').onclick = w.querySelector('#exvX2').onclick = function () { ov.remove(); };
    w.querySelector('#exvInt').onclick = function () { interno = !interno; render(ov); };
  }
  function abrir() {
    css(); interno = false;
    var old = document.getElementById('exvOv'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'exvOv'; ov.innerHTML = '<div class="w"></div>';
    document.body.appendChild(ov); render(ov);
  }
  window.abrirExplicaValor = abrir;
  window._exvInclusos = function () { var d = dados(); return d ? inclusos(d) : []; };

  // botão "💡 Entenda o valor" logo acima do Resultado
  function botao() {
    var rd = document.getElementById('resDetail'); if (!rd || document.getElementById('btnExv')) return;
    var sec = rd.closest('.sec'); if (!sec) return;
    var b = document.createElement('button'); b.id = 'btnExv'; b.type = 'button';
    b.innerHTML = '💡 Entenda o valor <span style="font-weight:500;opacity:.8">— mostrar ao cliente</span>';
    b.style.cssText = 'display:block;width:calc(100% - 32px);margin:12px 16px 0;min-height:46px;border-radius:12px;border:1px solid rgba(201,168,76,.55);background:rgba(201,168,76,.10);color:#f0d78c;font:800 .85rem Outfit,sans-serif;cursor:pointer';
    b.onclick = abrir;
    sec.parentNode.insertBefore(b, sec);
  }
  setInterval(botao, 1200);
})();
