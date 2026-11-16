// app-cubas-v2.js — v1: Catálogo de Cubas reorganizado (substitui buildCubaList do app-core.js).
// Corrige: cards que saíam da tela (grade sem minmax), cubas novas (bot / importação) que não apareciam
// por não ter "tipo", itens sem preço que sumiam. Acrescenta busca, ordenação e contagem por aba.
// Toque no card abre a tela cheia de sempre (abrirCubaFs). Cubas esculpidas continuam com a calculadora.
// Carregar DEPOIS de app-core.js.
(function () {
  if (window.__hrCubasV2) return; window.__hrCubasV2 = true;
  var Q = '', ORD = 'padrao';
  var ORDEM_LAV = ['Louça', 'Embutir', 'Sobrepor', 'Semi-encaixe', 'Apoio'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function brl(v) { return 'R$ ' + Math.round(+v || 0).toLocaleString('pt-BR'); }
  function css() {
    if (document.getElementById('cubasV2Css')) return;
    var s = document.createElement('style'); s.id = 'cubasV2Css';
    s.textContent = ''
      + '.cv2-top{position:sticky;top:0;z-index:5;background:var(--bg,#0a0a0d);padding:8px 0 6px}'
      + '.cv2-busca{display:flex;gap:6px}.cv2-busca input{flex:1 1 auto!important;width:auto!important;min-width:0;box-sizing:border-box;padding:10px 12px;border-radius:11px;border:1px solid var(--bd2);background:var(--s3);color:var(--tx);font-family:Outfit,sans-serif;font-size:.84rem;outline:none}'
      + '.cv2-busca select{flex:0 0 auto!important;width:auto!important;max-width:120px;padding:0 8px;border-radius:11px;border:1px solid var(--bd2);background:var(--s3);color:var(--t2);font-family:Outfit,sans-serif;font-size:.74rem}'
      + '.cv2-n{font-size:.68rem;color:var(--t3);margin-top:6px}'
      + '.cv2-sec{font-size:.6rem;letter-spacing:2.2px;text-transform:uppercase;color:var(--gold);font-weight:700;margin:16px 0 9px;display:flex;justify-content:space-between}'
      + '.cv2-sec span{color:var(--t4);letter-spacing:1px}'
      + '.cv2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}'
      + '@media(min-width:700px){.cv2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1000px){.cv2-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}'
      + '.cv2-card{min-width:0;background:var(--s1);border:1px solid var(--bd);border-radius:13px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;box-shadow:0 1px 6px rgba(0,0,0,.3)}'
      + '.cv2-card:active{transform:scale(.98)}'
      + '.cv2-img{position:relative;aspect-ratio:1/1;background:#fff;display:grid;place-items:center;overflow:hidden}'
      + '.cv2-img img{width:100%;height:100%;object-fit:contain;padding:8px;box-sizing:border-box;display:block}'
      + '.cv2-img .sem{font-size:2.4rem;opacity:.25}'
      + '.cv2-off{position:absolute;top:7px;left:7px;background:#00a650;color:#fff;font-size:.6rem;font-weight:800;padding:3px 6px;border-radius:4px}'
      + '.cv2-nf{position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,.55);color:#fff;font-size:.58rem;padding:2px 6px;border-radius:10px}'
      + '.cv2-b{padding:9px 10px 11px;display:flex;flex-direction:column;gap:2px;flex:1}'
      + '.cv2-marca{font-size:.56rem;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold3);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.cv2-nm{font-size:.8rem;color:var(--tx);font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.1em}'
      + '.cv2-dim{font-size:.64rem;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.cv2-pr{margin-top:auto;padding-top:6px;font-size:1.15rem;font-weight:900;color:var(--gold2);line-height:1.1}'
      + '.cv2-de{font-size:.66rem;color:var(--t4);text-decoration:line-through}'
      + '.cv2-inst{font-size:.6rem;color:var(--t3)}'
      + '.cv2-vazio{text-align:center;padding:40px 16px;color:var(--t3);font-size:.82rem}';
    document.head.appendChild(s);
  }
  function card(c, cat) {
    var fotos = (c.fotos || []).length || (c.photo ? 1 : 0), temDesc = c.pr_orig && c.pr_orig > c.pr;
    var inst = +c.instCli || 0;
    return '<div class="cv2-card" onclick="abrirCubaFs(\'' + esc(c.id) + '\',\'' + cat + '\')">'
      + '<div class="cv2-img">' + (temDesc ? '<div class="cv2-off">' + Math.round((1 - c.pr / c.pr_orig) * 100) + '% OFF</div>' : '')
      + (c.photo ? '<img loading="lazy" src="' + esc(c.photo) + '" alt="' + esc(c.nm) + '">' : '<div class="sem">🚰</div>')
      + (fotos > 1 ? '<div class="cv2-nf">📷 ' + fotos + '</div>' : '') + '</div>'
      + '<div class="cv2-b">' + (c.brand || c.marca ? '<div class="cv2-marca">' + esc(c.brand || c.marca) + '</div>' : '')
      + '<div class="cv2-nm">' + esc(c.nm) + '</div>' + (c.dim ? '<div class="cv2-dim">' + esc(c.dim) + '</div>' : '')
      + (temDesc ? '<div class="cv2-de">' + brl(c.pr_orig) + '</div>' : '')
      + (c.tipo === 'Esculpida' ? (c.pr > 0 ? '<div class="cv2-inst" style="margin-top:auto;padding-top:6px;">a partir de</div><div class="cv2-pr" style="padding-top:0;">' + brl(c.pr) + '</div>' : '<div class="cv2-pr" style="font-size:.8rem;color:var(--t2);">Preço pela medida</div>')
        : c.pr > 0 ? '<div class="cv2-pr">' + brl(c.pr) + '</div>' : '<div class="cv2-pr" style="font-size:.85rem;color:var(--t2);">Sob consulta</div>')
      + '</div></div>';
  }
  function esculpidas(items, cat) {
    var h = '<div class="cv2-sec">Cubas esculpidas na pedra<span>' + items.length + '</span></div>'
      + '<div class="cv2-grid" style="margin-bottom:10px;">' + items.map(function (c) { return card(c, cat); }).join('') + '</div>'
      + '<div style="font-size:.6rem;letter-spacing:1.6px;text-transform:uppercase;color:var(--t3);font-weight:700;margin:4px 0 7px;">Calcular pela medida</div>'
      + '<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:12px;padding:13px 14px;margin-bottom:10px;">'
      + '<div style="font-size:.72rem;color:var(--t2);line-height:1.6;margin-bottom:10px;">Cuba escavada direto na pedra. Informe as medidas para calcular o preço.</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px;">';
    [['escW', 'Comprimento', 50, 20], ['escH', 'Largura', 40, 20], ['escD', 'Profundidade', 20, 10]].forEach(function (f) {
      h += '<div style="min-width:0;"><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">' + f[1] + ' (cm)</div><input type="number" id="' + f[0] + '" placeholder="' + f[2] + '" min="' + f[3] + '" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px;color:var(--tx);font-size:.85rem;"></div>';
    });
    h += '</div>';
    items.forEach(function (e) {
      h += '<button onclick="pickEsculpida(\'' + esc(e.id) + '\',\'' + cat + '\')" style="width:100%;background:var(--gdim);border:1px solid var(--gold3);border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-family:Outfit,sans-serif;">'
        + '<div style="text-align:left;min-width:0;"><div style="font-size:.82rem;font-weight:700;color:var(--tx);">' + esc(e.nm) + '</div><div style="font-size:.64rem;color:var(--t3);margin-top:2px;">Mão de obra base: ' + brl(e.inst) + '</div></div>'
        + '<div style="font-size:.72rem;color:var(--gold2);font-weight:700;white-space:nowrap;">Calcular →</div></button>';
    });
    return h + '</div>';
  }
  function buildCubaListV2() {
    var wrap = document.getElementById('cubaListWrap'); if (!wrap || typeof CFG === 'undefined' || !CFG) return;
    css();
    var cat = (typeof cubaCat !== 'undefined' && cubaCat === 'lav') ? 'lav' : 'coz';
    var lista = (cat === 'coz' ? CFG.coz : CFG.lav) || [];
    // contagem nas abas
    try { document.querySelectorAll('#cubaTabs [data-ccat]').forEach(function (t) { var k = t.getAttribute('data-ccat'), n = ((k === 'coz' ? CFG.coz : CFG.lav) || []).filter(function (c) { return c.tipo !== 'Esculpida'; }).length; var base = t.getAttribute('data-lbl') || t.textContent.replace(/\s*\(\d+\)$/, ''); t.setAttribute('data-lbl', base); t.textContent = base + ' (' + n + ')'; }); } catch (e) {}
    var q = norm(Q).trim();
    var vis = lista.filter(function (c) { return c && (!q || norm([c.nm, c.brand, c.marca, c.dim, c.tipo, c.titulo].join(' ')).indexOf(q) >= 0); });
    var esc_ = vis.filter(function (c) { return c.tipo === 'Esculpida'; }), normais = vis.filter(function (c) { return c.tipo !== 'Esculpida'; });
    if (ORD === 'menor') normais.sort(function (a, b) { return (a.pr || 9e9) - (b.pr || 9e9); });
    else if (ORD === 'maior') normais.sort(function (a, b) { return (b.pr || 0) - (a.pr || 0); });
    else if (ORD === 'az') normais.sort(function (a, b) { return String(a.nm).localeCompare(String(b.nm), 'pt-BR'); });
    var h = '<div class="cv2-top"><div class="cv2-busca"><input id="cv2Q" type="search" placeholder="🔍 Buscar nome, marca ou medida" value="' + esc(Q) + '">'
      + '<select id="cv2O"><option value="padrao">Ordem</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="az">A–Z</option></select></div>'
      + '<div class="cv2-n">' + normais.length + ' modelo' + (normais.length === 1 ? '' : 's') + (q ? ' para "' + esc(Q) + '"' : '') + '</div></div>';
    if (!normais.length && !esc_.length) h += '<div class="cv2-vazio">Nenhuma cuba encontrada.' + (q ? '' : '<br>Cadastre em Config → Cubas, ou mande os prints pelo WhatsApp do bot com a legenda "cadastrar cuba".') + '</div>';
    // grupos
    var grupos = {}, ordem = [];
    normais.forEach(function (c) { var g = cat === 'coz' ? (c.tipo && c.tipo !== 'HR' ? c.tipo : 'Cubas de cozinha') : (c.tipo || 'Outros modelos'); if (!grupos[g]) { grupos[g] = []; ordem.push(g); } grupos[g].push(c); });
    if (ORD === 'padrao') {
      var pref = cat === 'coz' ? ['Cubas de cozinha'] : ORDEM_LAV;
      ordem.sort(function (a, b) { var ia = pref.indexOf(a), ib = pref.indexOf(b); if (a === 'Outros modelos') ia = 98; if (b === 'Outros modelos') ib = 98; return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib) || a.localeCompare(b); });
      ordem.forEach(function (g) { var titulo = cat === 'lav' && ORDEM_LAV.indexOf(g) >= 0 ? 'Cubas ' + g : g; h += '<div class="cv2-sec">' + esc(titulo) + '<span>' + grupos[g].length + '</span></div><div class="cv2-grid">' + grupos[g].map(function (c) { return card(c, cat); }).join('') + '</div>'; });
    } else if (normais.length) h += '<div class="cv2-grid" style="margin-top:12px;">' + normais.map(function (c) { return card(c, cat); }).join('') + '</div>';
    if (cat === 'lav' && esc_.length) h += esculpidas(esc_, cat);
    h += '<div style="display:flex;gap:8px;margin-top:14px;">'
      + '<button onclick="gerarCatalogoPDF()" style="flex:1;padding:12px;border-radius:11px;background:linear-gradient(135deg,#1a0a00,#2a1200);border:1px solid var(--gold3);color:var(--gold2);font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;">📄 Catálogo PDF</button>'
      + '<button onclick="compartilharCatalogoCubas()" style="flex:1;padding:12px;border-radius:11px;background:#0a1f0f;border:1px solid #1a4a2a;color:#4ade80;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:600;">📤 Compartilhar</button></div>';
    var foco = document.activeElement && document.activeElement.id === 'cv2Q', pos = foco ? document.activeElement.selectionStart : 0;
    wrap.innerHTML = h;
    var inp = document.getElementById('cv2Q'), sel = document.getElementById('cv2O');
    sel.value = ORD;
    inp.oninput = function () { Q = inp.value; clearTimeout(inp._t); inp._t = setTimeout(buildCubaListV2, 150); };
    sel.onchange = function () { ORD = sel.value; buildCubaListV2(); };
    if (foco) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
  }
  window.buildCubaList = buildCubaListV2;
  try { buildCubaList = buildCubaListV2; } catch (e) {}
  setTimeout(function () { var pg = document.getElementById('pg2'); if (pg && pg.classList.contains('on')) buildCubaListV2(); }, 500);
})();
