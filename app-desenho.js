// app-desenho.js — v1: 📐 Desenho técnico (substitui o desenho à mão no tablet)
// Bancada reta, em L ou em U com medidas reais: o desenho sai em escala, com cotas, frontões, saias, cuba, cooktop, furos e o
// rebaixo; a lista de peças (corte) sai sozinha. Gera a ficha técnica (PNG) com o cabeçalho da HR, guarda no aparelho e manda
// para a produção pelo bot (no pedido certo, com as peças do desenho e para quem faz cada etapa).
(function () {
  'use strict';
  if (window.__hrDes) return; window.__hrDes = true;
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : (d || 0); }
  function f1(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || 'Erro ' + r.status); return j; });
    });
  }
  var KEY = 'hr_desenhos';
  function lista() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function guardar(d) { var l = lista().filter(function (x) { return x.id !== d.id; }); d.em = Date.now(); l.unshift(JSON.parse(JSON.stringify(d))); try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 60))); } catch (e) {} }
  function novo() { return { id: 'd' + Date.now(), cliente: '', material: '', desc: '', forma: 'L', A: 181, B: 95, C: 95, p: 60, esp: 2, frAlt: 10, saiaAlt: 4, saiaTipo: 'reta', bordas: {}, recortes: [], obs: '', pid: '' }; }
  var st = { d: null, sel: null, tela: 'lista', prod: null };

  // ── geometria (cm; x para a direita, y para baixo; paredes em cima e à esquerda) ──
  function geo(d) {
    var A = Math.max(10, num(d.A)), B = Math.max(10, num(d.B)), C = Math.max(10, num(d.C)), p = Math.max(5, Math.min(num(d.p), Math.min(A, d.forma === 'reta' ? 999 : B) - 1));
    var pts, pecas;
    if (d.forma === 'reta') { pts = [[0, 0], [A, 0], [A, p], [0, p]]; pecas = [{ k: 'A', nome: 'Bancada', x: 0, y: 0, w: A, h: p, dir: 'h' }]; }
    else if (d.forma === 'U') { C = Math.max(p + 1, C); pts = [[0, 0], [A, 0], [A, C], [A - p, C], [A - p, p], [p, p], [p, B], [0, B]]; pecas = [{ k: 'A', nome: 'Bancada (fundo)', x: 0, y: 0, w: A, h: p, dir: 'h' }, { k: 'B', nome: 'Bancada (esquerda)', x: 0, y: p, w: p, h: B - p, dir: 'v' }, { k: 'C', nome: 'Bancada (direita)', x: A - p, y: p, w: p, h: C - p, dir: 'v' }]; }
    else { pts = [[0, 0], [A, 0], [A, p], [p, p], [p, B], [0, B]]; pecas = [{ k: 'A', nome: 'Bancada (lado maior)', x: 0, y: 0, w: A, h: p, dir: 'h' }, { k: 'B', nome: 'Bancada (lado menor)', x: 0, y: p, w: p, h: B - p, dir: 'v' }]; }
    var arestas = pts.map(function (a, i) { var b = pts[(i + 1) % pts.length]; return { i: i, a: a, b: b, len: Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10) / 10 }; });
    arestas.forEach(function (e) { var t = d.bordas[e.i]; if (!t) t = (e.a[1] === 0 && e.b[1] === 0) || (e.a[0] === 0 && e.b[0] === 0) || (d.forma === 'U' && e.a[0] === A && e.b[0] === A) ? 'parede' : 'livre'; e.tipo = t; });
    return { pts: pts, pecas: pecas, arestas: arestas, A: A, B: B, C: C, p: p };
  }
  function listaPecas(d, g) {
    var L = g.pecas.map(function (pc) { var c = pc.dir === 'h' ? pc.w : pc.h, l = pc.dir === 'h' ? pc.h : pc.w; return { nome: pc.nome, tipo: 'bancada', qtd: 1, c: Math.round(c * 10) / 10, l: Math.round(l * 10) / 10 }; });
    g.arestas.forEach(function (e) { if (e.tipo === 'parede' && num(d.frAlt) > 0) L.push({ nome: 'Frontão', tipo: 'frontao', qtd: 1, c: e.len, l: num(d.frAlt) }); if (e.tipo === 'saia' && num(d.saiaAlt) > 0) L.push({ nome: 'Saia ' + (d.saiaTipo === '45' ? 'em 45°' : d.saiaTipo), tipo: 'saia', qtd: 1, c: e.len, l: num(d.saiaAlt) }); });
    d.recortes.forEach(function (r) { if (r.tipo === 'rebaixo') L.push({ nome: 'Tampo do rebaixo americano', tipo: 'tampo', qtd: 1, c: num(r.w), l: num(r.h) }); });
    return L;
  }
  function servicos(d) {
    var sv = [], cuba = d.recortes.filter(function (r) { return r.tipo === 'cuba'; })[0];
    if (cuba) sv.push(/lavat|banh/i.test(d.desc) ? 'cuba_lav' : 'cuba_coz');
    if (d.recortes.some(function (r) { return r.tipo === 'cooktop'; })) sv.push('cook');
    if (d.recortes.some(function (r) { return r.tipo === 'rebaixo'; })) sv.push('reb_a');
    if (d.recortes.some(function (r) { return r.tipo === 'furo'; })) sv.push('forn');
    if (g0().arestas.some(function (e) { return e.tipo === 'saia'; })) sv.push({ reta: 's_reta', slim: 's_slim', boleada: 's_boleada', '45': 's_45' }[d.saiaTipo] || 's_reta');
    return { sv: sv, cuba: cuba ? 'desenho' : '', cubaInst: cuba ? ({ embutida: 'embutir', sobrepor: 'sobrepor', flush: 'flush' }[cuba.inst] || '') : '' };
  }
  function g0() { return geo(st.d); }
  // posição de um recorte (cm) dentro da peça escolhida
  function rectRec(g, r) {
    var pc = g.pecas.filter(function (x) { return x.k === r.peca; })[0] || g.pecas[0], w = num(r.w), h = num(r.h);
    if (r.tipo === 'furo') { w = h = 3.5; }
    var x, y; if (pc.dir === 'h') { x = pc.x + num(r.x); y = pc.y + (num(r.frente) > 0 ? pc.h - num(r.frente) - h : (pc.h - h) / 2); }
    else { var vw = h, vh = w; x = pc.x + (pc.w - vw) / 2; y = pc.y + num(r.x); w = vw; h = vh; if (num(r.frente) > 0) x = pc.x + pc.w - num(r.frente) - w; }
    return { x: x, y: y, w: w, h: h, pc: pc };
  }

  // ── desenho SVG (vista de cima, em escala, com cotas) ──
  function cota(x1, y1, x2, y2, txt, lado, k) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * lado, ny = dx / L * lado, o = 26 * (k || 1);
    var a1 = [x1 + nx * o, y1 + ny * o], a2 = [x2 + nx * o, y2 + ny * o], mx = (a1[0] + a2[0]) / 2 + nx * 13, my = (a1[1] + a2[1]) / 2 + ny * 13, ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
    return '<g stroke="#1d4ed8" stroke-width="1.1" fill="none"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + (a1[0] + nx * 5) + '" y2="' + (a1[1] + ny * 5) + '" stroke-dasharray="2 2"/><line x1="' + x2 + '" y1="' + y2 + '" x2="' + (a2[0] + nx * 5) + '" y2="' + (a2[1] + ny * 5) + '" stroke-dasharray="2 2"/><line x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + a2[0] + '" y2="' + a2[1] + '" marker-start="url(#seta)" marker-end="url(#seta)"/></g>'
      + '<text x="' + mx + '" y="' + (my + 4) + '" fill="#1d4ed8" font-size="13" font-weight="700" text-anchor="middle" transform="rotate(' + ang + ' ' + mx + ' ' + (my + 4) + ')">' + esc(txt) + '</text>';
  }
  function desenhoSvg(d, W, H, sel) {
    var g = geo(d), maxX = g.A, maxY = Math.max(g.p, d.forma === 'reta' ? g.p : Math.max(g.B, d.forma === 'U' ? g.C : 0)), pad = 70;
    var s = Math.min((W - 2 * pad) / maxX, (H - 2 * pad) / maxY), ox = pad + ((W - 2 * pad) - maxX * s) / 2, oy = pad + ((H - 2 * pad) - maxY * s) / 2;
    var P = function (q) { return [ox + q[0] * s, oy + q[1] * s]; };
    var h = '<defs><marker id="seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,2 L10,5 L0,8 z" fill="#1d4ed8"/></marker><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#6b7280" stroke-width="1.2"/></pattern></defs>';
    h += '<polygon points="' + g.pts.map(function (q) { return P(q).join(','); }).join(' ') + '" fill="#f3f4f6" stroke="#111827" stroke-width="2.2"/>';
    g.pecas.forEach(function (pc, i) { if (i === 0) return; var a = P([pc.x, pc.y]), b = P([pc.x + pc.w, pc.y]); if (pc.dir === 'v') h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#9ca3af" stroke-width="1.3" stroke-dasharray="6 4"/>'; });
    g.arestas.forEach(function (e) {
      var a = P(e.a), b = P(e.b), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L; // normal para fora (polígono no sentido horário na tela)
      if (e.tipo === 'parede') h += '<polygon points="' + [a, b, [b[0] + nx * 10, b[1] + ny * 10], [a[0] + nx * 10, a[1] + ny * 10]].map(function (q) { return q.join(','); }).join(' ') + '" fill="url(#hach)" stroke="#374151" stroke-width="1"/>';
      if (e.tipo === 'saia') h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#dc2626" stroke-width="5" stroke-dasharray="10 5"/>';
      if (sel) h += '<line data-borda="' + e.i + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="transparent" stroke-width="26" style="cursor:pointer"/>';
    });
    d.recortes.forEach(function (r, i) {
      var q = rectRec(g, r), a = P([q.x, q.y]), w = q.w * s, hh = q.h * s;
      if (r.tipo === 'furo') { h += '<circle cx="' + (a[0] + w / 2) + '" cy="' + (a[1] + hh / 2) + '" r="' + Math.max(4, w / 2) + '" fill="#fff" stroke="#111827" stroke-width="1.5"/>'; return; }
      var cor = r.tipo === 'cuba' ? '#0369a1' : r.tipo === 'cooktop' ? '#b45309' : '#7c3aed';
      h += '<rect x="' + a[0] + '" y="' + a[1] + '" width="' + w + '" height="' + hh + '" rx="' + (r.tipo === 'cuba' ? 6 : 2) + '" fill="#fff" stroke="' + cor + '" stroke-width="2"' + (r.tipo === 'rebaixo' ? ' stroke-dasharray="5 3"' : '') + '/>';
      h += '<text x="' + (a[0] + w / 2) + '" y="' + (a[1] + hh / 2 + 4) + '" font-size="11" text-anchor="middle" fill="' + cor + '" font-weight="700">' + ({ cuba: 'CUBA ' + (r.inst || '').toUpperCase(), cooktop: 'COOKTOP', rebaixo: 'REBAIXO' }[r.tipo] || '') + '</text>';
      var pc = q.pc, ini = pc.dir === 'h' ? P([pc.x, q.y + q.h]) : P([q.x + q.w, pc.y]);
      if (pc.dir === 'h') { h += cota(ini[0], a[1] + hh, a[0], a[1] + hh, f1(num(r.x)), 1, 0.6) + cota(a[0], a[1] + hh, a[0] + w, a[1] + hh, f1(q.w), 1, 0.6); }
      else { h += cota(a[0] + w, ini[1], a[0] + w, a[1], f1(num(r.x)), -1, 0.6) + cota(a[0] + w, a[1], a[0] + w, a[1] + hh, f1(q.h), -1, 0.6); }
    });
    var p0 = P([0, 0]), pA = P([g.A, 0]);
    h += cota(p0[0], p0[1], pA[0], pA[1], f1(g.A), -1, 1.4);
    if (d.forma !== 'reta') { var pB = P([0, g.B]); h += cota(pB[0], pB[1], p0[0], p0[1], f1(g.B), -1, 1.4); }
    if (d.forma === 'U') { var c1 = P([g.A, 0]), c2 = P([g.A, g.C]); h += cota(c1[0], c1[1], c2[0], c2[1], f1(g.C), -1, 1.4); }
    var q1 = P([g.A, 0]), q2 = P([g.A, g.p]); if (d.forma !== 'U') h += cota(q1[0], q1[1], q2[0], q2[1], f1(g.p), -1, 1);
    else { var u1 = P([g.A - g.p, g.C]), u2 = P([g.A, g.C]); h += cota(u1[0], u1[1], u2[0], u2[1], f1(g.p), 1, 1); }
    if (d.forma === 'L') { var l1 = P([0, g.B]), l2 = P([g.p, g.B]); h += cota(l1[0], l1[1], l2[0], l2[1], f1(g.p), 1, 1); }
    return h;
  }
  function fichaSvg(d) {
    var W = 1123, H = 794, g = geo(d), pcs = listaPecas(d, g), hoje = new Date().toLocaleDateString('pt-BR');
    var h = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Arial, Helvetica, sans-serif"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    h += '<rect x="16" y="16" width="' + (W - 32) + '" height="' + (H - 32) + '" fill="none" stroke="#111827" stroke-width="2"/>';
    h += '<text x="36" y="58" font-size="26" font-weight="800" fill="#111827">HR Mármores e Granitos</text><text x="36" y="82" font-size="14" fill="#6b7280">Desenho técnico · medidas em centímetros</text>';
    h += '<text x="' + (W - 36) + '" y="50" font-size="13" text-anchor="end" fill="#374151">' + esc(hoje) + '</text>';
    var info = [['Cliente', d.cliente || '—'], ['Descrição', d.desc || ({ reta: 'Bancada reta', L: 'Bancada em L', U: 'Bancada em U' }[d.forma])], ['Material', d.material || '—'], ['Espessura', f1(num(d.esp)) + ' cm']];
    info.forEach(function (x, i) { h += '<text x="' + (W - 36) + '" y="' + (70 + i * 17) + '" font-size="13" text-anchor="end" fill="#111827"><tspan font-weight="700">' + x[0] + ':\u00a0</tspan>' + esc(x[1]) + '</text>'; });
    h += '<line x1="16" y1="140" x2="' + (W - 16) + '" y2="140" stroke="#111827" stroke-width="1.5"/>';
    h += '<svg x="16" y="140" width="740" height="' + (H - 156) + '" viewBox="0 0 740 ' + (H - 156) + '">' + desenhoSvg(d, 740, H - 156, false) + '</svg>';
    h += '<line x1="756" y1="140" x2="756" y2="' + (H - 16) + '" stroke="#111827" stroke-width="1.5"/>';
    var y = 168; h += '<text x="772" y="' + y + '" font-size="15" font-weight="800">LISTA DE PEÇAS (corte)</text>'; y += 22;
    pcs.forEach(function (pc, i) { h += '<text x="772" y="' + y + '" font-size="12.5"><tspan font-weight="700">' + (i + 1) + '.</tspan> ' + esc(pc.nome) + '</text><text x="' + (W - 36) + '" y="' + y + '" font-size="12.5" text-anchor="end" font-weight="700">' + (pc.qtd > 1 ? pc.qtd + '× ' : '') + f1(pc.c) + ' × ' + f1(pc.l) + '</text>'; y += 19; });
    y += 10; if (d.recortes.length) { h += '<text x="772" y="' + y + '" font-size="15" font-weight="800">RECORTES</text>'; y += 22;
      d.recortes.forEach(function (r) { var t = { cuba: 'Cuba ' + (r.inst || ''), cooktop: 'Cooktop', rebaixo: 'Rebaixo americano', furo: 'Furo da torneira' }[r.tipo] || r.tipo; h += '<text x="772" y="' + y + '" font-size="12.5">• ' + esc(t) + (r.tipo !== 'furo' ? ' ' + f1(num(r.w)) + '×' + f1(num(r.h)) : '') + ' · a ' + f1(num(r.x)) + ' do início (' + esc(r.peca) + ')' + '</text>'; y += 18; }); }
    y += 10; h += '<text x="772" y="' + y + '" font-size="15" font-weight="800">LEGENDA</text>'; y += 20;
    h += '<rect x="772" y="' + (y - 10) + '" width="26" height="10" fill="url(#hach)" stroke="#374151"/><text x="806" y="' + y + '" font-size="12">Parede / frontão ' + f1(num(d.frAlt)) + ' cm</text>'; y += 18;
    h += '<line x1="772" y1="' + (y - 4) + '" x2="798" y2="' + (y - 4) + '" stroke="#dc2626" stroke-width="5" stroke-dasharray="7 4"/><text x="806" y="' + y + '" font-size="12">Saia ' + esc(d.saiaTipo === '45' ? 'em 45°' : d.saiaTipo) + ' ' + f1(num(d.saiaAlt)) + ' cm</text>'; y += 18;
    h += '<line x1="772" y1="' + (y - 4) + '" x2="798" y2="' + (y - 4) + '" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="6 4"/><text x="806" y="' + y + '" font-size="12">Emenda das peças</text>'; y += 24;
    if (d.obs) { h += '<text x="772" y="' + y + '" font-size="15" font-weight="800">OBSERVAÇÕES</text>'; y += 20; String(d.obs).match(/.{1,40}(\s|$)/g).slice(0, 8).forEach(function (l) { h += '<text x="772" y="' + y + '" font-size="12">' + esc(l.trim()) + '</text>'; y += 16; }); }
    return h.replace('<rect width="' + W, '<defs><pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#6b7280" stroke-width="1.2"/></pattern></defs><rect width="' + W) + '</svg>';
  }
  function pngDe(d) {
    return new Promise(function (ok, erro) {
      var svg = fichaSvg(d), img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () { var c = document.createElement('canvas'); c.width = 2246; c.height = 1588; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : erro(new Error('Falha ao gerar a imagem')); }, 'image/png'); };
      img.onerror = function () { URL.revokeObjectURL(url); erro(new Error('Falha ao desenhar')); };
      img.src = url;
    });
  }
  function b64(blob) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = erro; r.readAsDataURL(blob); }); }

  // ── tela ──
  var CSS = '#hrDes{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit}#hrDes *{box-sizing:border-box}'
    + '.des-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.des-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.des-sub{font-size:.72rem;color:#9a917e}'
    + '.des-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 10px}'
    + '.des-main{flex:1;overflow:auto;display:flex;flex-wrap:wrap;gap:12px;padding:12px 12px 90px}'
    + '.des-cv{flex:2 1 520px;min-height:360px;background:#fff;border-radius:14px;overflow:hidden}.des-cv svg{width:100%;height:100%;display:block}'
    + '.des-pn{flex:1 1 300px;max-width:520px}.des-sec{border-radius:14px;padding:12px;margin-bottom:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}'
    + '.des-sec h4{margin:0 0 8px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#c9a84c}'
    + '.des-g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}.des-g2{display:grid;grid-template-columns:1fr 1fr;gap:7px}.des-l{font-size:.64rem;color:#9a917e;display:block;margin-bottom:2px}'
    + '.des-i,.des-s{width:100%;padding:9px;border-radius:10px;background:#16130e;color:#efe9dc;border:1px solid rgba(201,168,76,.25);font-size:.88rem}'
    + '.des-fm{display:flex;gap:6px}.des-fm button{flex:1;padding:10px 0;border-radius:11px;border:1px solid rgba(201,168,76,.25);background:#16130e;color:#c9bfa6;font-weight:800;cursor:pointer}.des-fm button.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408}'
    + '.des-rc{border-radius:11px;padding:8px;margin-top:7px;background:#16130e;border:1px solid rgba(255,255,255,.06)}'
    + '.des-bt{width:100%;padding:13px;border-radius:13px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-size:.92rem;margin-top:8px;cursor:pointer}.des-bt2{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:#f0d78c}'
    + '.des-pc{display:flex;justify-content:space-between;font-size:.8rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}.des-pc b{color:#f0d78c}'
    + '.des-li{display:flex;align-items:center;gap:10px;border-radius:13px;padding:12px;margin-bottom:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);cursor:pointer}'
    + '.des-dica{font-size:.74rem;color:#9a917e;margin-top:6px;line-height:1.4}'
    + '.des-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(96,165,250,.14),rgba(201,168,76,.05));border:1px solid rgba(96,165,250,.35);color:#efe9dc;cursor:pointer}.des-card-sec .ic{font-size:1.5rem}.des-card-sec .t{font-weight:800}.des-card-sec .s{font-size:.72rem;color:#9a917e}';
  function css() { if (document.getElementById('hrDesCss')) return; var s = document.createElement('style'); s.id = 'hrDesCss'; s.textContent = CSS; document.head.appendChild(s); }
  function campo(k, rot, v, tipo) { return '<div><span class="des-l">' + rot + '</span><input class="des-i" data-f="' + k + '" value="' + esc(v) + '"' + (tipo === 'n' ? ' inputmode="decimal"' : '') + '></div>'; }
  function selc(k, rot, v, ops) { return '<div><span class="des-l">' + rot + '</span><select class="des-s" data-f="' + k + '">' + ops.map(function (o) { return '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>'; }
  function painel() {
    var d = st.d, g = geo(d), pcs = listaPecas(d, g), ks = g.pecas.map(function (p) { return [p.k, p.k + ' · ' + p.nome.replace('Bancada ', '')]; });
    var h = '<div class="des-sec"><h4>Projeto</h4><div class="des-g2">' + campo('cliente', 'Cliente', d.cliente) + campo('material', 'Material', d.material) + '</div><div style="margin-top:7px">' + campo('desc', 'Descrição', d.desc) + '</div></div>';
    h += '<div class="des-sec"><h4>Formato</h4><div class="des-fm">' + [['reta', '▬ Reta'], ['L', '⌐ Em L'], ['U', '⊔ Em U']].map(function (f) { return '<button data-forma="' + f[0] + '" class="' + (d.forma === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>'
      + '<div class="des-g" style="margin-top:8px">' + campo('A', d.forma === 'reta' ? 'Comprimento' : 'Lado maior (A)', d.A, 'n') + (d.forma !== 'reta' ? campo('B', 'Lado esquerdo (B)', d.B, 'n') : '') + (d.forma === 'U' ? campo('C', 'Lado direito (C)', d.C, 'n') : '') + campo('p', 'Profundidade', d.p, 'n') + campo('esp', 'Espessura', d.esp, 'n') + '</div>'
      + '<div class="des-dica">Toque numa borda do desenho para trocar: <b>livre</b> → <b>parede (frontão)</b> → <b>saia</b>.</div></div>';
    h += '<div class="des-sec"><h4>Frontão e saia</h4><div class="des-g">' + campo('frAlt', 'Altura do frontão', d.frAlt, 'n') + campo('saiaAlt', 'Altura da saia', d.saiaAlt, 'n') + selc('saiaTipo', 'Tipo da saia', d.saiaTipo, [['reta', 'Reta'], ['slim', 'Slim'], ['boleada', 'Boleada'], ['45', 'Em 45°']]) + '</div></div>';
    h += '<div class="des-sec"><h4>Recortes</h4>' + d.recortes.map(function (r, i) {
      return '<div class="des-rc" data-rc="' + i + '"><div class="des-g">' + selc('r_tipo', 'Tipo', r.tipo, [['cuba', 'Cuba'], ['cooktop', 'Cooktop'], ['rebaixo', 'Rebaixo americano'], ['furo', 'Furo torneira']]) + selc('r_peca', 'Na peça', r.peca, ks) + (r.tipo === 'cuba' ? selc('r_inst', 'Instalação', r.inst, [['embutida', 'Embutida'], ['sobrepor', 'Sobrepor'], ['flush', 'Flush']]) : '<div></div>') + '</div>'
        + '<div class="des-g" style="margin-top:6px">' + campo('r_x', 'Distância do início', r.x, 'n') + (r.tipo !== 'furo' ? campo('r_w', 'Largura', r.w, 'n') + campo('r_h', 'Profundidade', r.h, 'n') : '') + '</div>'
        + '<div class="des-g2" style="margin-top:6px">' + campo('r_frente', 'Da borda da frente (0 = centro)', r.frente || 0, 'n') + '<button class="des-bt des-bt2" style="margin:14px 0 0" data-rmrc="' + i + '">Remover</button></div></div>';
    }).join('') + '<div class="des-g2" style="margin-top:8px"><button class="des-bt des-bt2" style="margin:0" data-addrc="cuba">+ Cuba</button><button class="des-bt des-bt2" style="margin:0" data-addrc="cooktop">+ Cooktop</button><button class="des-bt des-bt2" style="margin:0" data-addrc="rebaixo">+ Rebaixo</button><button class="des-bt des-bt2" style="margin:0" data-addrc="furo">+ Furo</button></div></div>';
    h += '<div class="des-sec"><h4>Lista de peças (sai sozinha)</h4>' + pcs.map(function (p, i) { return '<div class="des-pc"><span>' + (i + 1) + '. ' + esc(p.nome) + '</span><b>' + f1(p.c) + ' × ' + f1(p.l) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="des-sec"><h4>Observações para a equipe</h4><textarea class="des-i" data-f="obs" rows="3">' + esc(d.obs) + '</textarea></div>';
    h += '<button class="des-bt" data-acao="png">📄 Gerar ficha técnica (imagem)</button><button class="des-bt" data-acao="prod">🏭 Enviar para a produção</button><button class="des-bt des-bt2" data-acao="salvar">💾 Salvar</button>';
    return h;
  }
  function telaEditor() {
    var m = document.getElementById('desMain'); if (!m) return;
    m.innerHTML = '<div class="des-cv" id="desCv"></div><div class="des-pn" id="desPn">' + painel() + '</div>';
    desenharCv();
  }
  function desenharCv() { var cv = document.getElementById('desCv'); if (!cv) return; var W = Math.max(500, cv.clientWidth || 700), H = Math.max(360, Math.round(W * 0.62)); cv.style.height = H + 'px'; cv.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + desenhoSvg(st.d, W, H, true) + '</svg>'; }
  function atualizarLista() { var pn = document.getElementById('desPn'); if (!pn) return; var y = pn.scrollTop; var foco = document.activeElement && document.activeElement.getAttribute('data-f'), rc = document.activeElement && document.activeElement.closest('[data-rc]'); pn.innerHTML = painel(); pn.scrollTop = y; if (foco) { var sel = rc ? pn.querySelector('[data-rc="' + rc.getAttribute('data-rc') + '"] [data-f="' + foco + '"]') : pn.querySelector('[data-f="' + foco + '"]'); if (sel) { sel.focus(); try { var v = sel.value; sel.setSelectionRange(v.length, v.length); } catch (e) {} } } }
  function telaLista() {
    var m = document.getElementById('desMain'); if (!m) return; var l = lista();
    m.innerHTML = '<div style="flex:1 1 100%;max-width:720px;margin:0 auto"><button class="des-bt" data-acao="novo">＋ Novo desenho</button><div style="height:10px"></div>' + (l.length ? l.map(function (d) { return '<div class="des-li" data-abre="' + esc(d.id) + '"><span style="font-size:1.4rem">📐</span><div style="flex:1"><b>' + esc(d.cliente || 'Sem cliente') + '</b><div class="des-sub">' + esc(d.desc || ({ reta: 'Bancada reta', L: 'Bancada em L', U: 'Bancada em U' }[d.forma])) + ' · ' + f1(num(d.A)) + (d.forma !== 'reta' ? '×' + f1(num(d.B)) : '') + ' · ' + new Date(d.em).toLocaleDateString('pt-BR') + '</div></div><span style="color:#c9a84c">›</span></div>'; }).join('') : '<div class="des-dica" style="text-align:center;padding:30px">Nenhum desenho ainda. Toque em <b>Novo desenho</b>.</div>') + '</div>';
  }
  function render() { var sub = document.getElementById('desSub'); if (st.tela === 'lista') { if (sub) sub.textContent = 'Projetos com medidas reais para a equipe'; telaLista(); } else { if (sub) sub.textContent = st.d.cliente || 'Novo desenho'; telaEditor(); } }
  function lerCampo(el) {
    var k = el.getAttribute('data-f'), v = el.value, rc = el.closest('[data-rc]'), d = st.d;
    if (rc) { var r = d.recortes[+rc.getAttribute('data-rc')], kk = k.slice(2); r[kk] = /^(x|w|h|frente)$/.test(kk) ? num(v) : v; if (kk === 'tipo') { var pad = { cuba: [50, 40], cooktop: [56, 49], rebaixo: [80, 40], furo: [3.5, 3.5] }[v]; r.w = pad[0]; r.h = pad[1]; atualizarLista(); } return; }
    d[k] = /^(A|B|C|p|esp|frAlt|saiaAlt)$/.test(k) ? num(v) : v;
  }
  function enviarProducao() {
    var d = st.d; aviso('Carregando os pedidos…');
    api('/bot/producao').then(function (pr) {
      var ops = pr.pedidos.map(function (p, i) { return (i + 1) + '. ' + p.nome; }).join('\n');
      var esc1 = prompt('Para qual pedido é este desenho? Digite o número (vazio = só mandar a imagem):\n' + ops, ''), ped = esc1 ? pr.pedidos[(+esc1) - 1] : null;
      if (esc1 && !ped) { aviso('Número inválido'); return; }
      var usar = ped ? confirm('Usar a lista de peças deste desenho no pedido de ' + ped.nome + '? (as etapas e os pontos passam a usar estas medidas)') : false;
      var para = confirm('Mandar a imagem no WhatsApp de quem faz o corte, o polimento e a fabricação?') ? ['fabResp', 'poliResp', 'fab2Resp'] : [];
      if (!ped && !para.length) { aviso('Nada a fazer.'); return; }
      if (!ped) { var ids = prompt('Sem pedido: para quem mandar? Escreva os nomes separados por vírgula (ex.: Fabrício, Hugo)', ''); if (!ids) return; para = (pr.equipe || []).filter(function (f) { return ids.toLowerCase().split(',').some(function (n) { return n.trim() && f.nome.toLowerCase().indexOf(n.trim()) === 0; }); }).map(function (f) { return f.id; }); }
      return pngDe(d).then(b64).then(function (png) {
        var g = geo(d), pcs = listaPecas(d, g), sv = servicos(d);
        var itens = [{ ambiente: d.desc || ({ reta: 'Bancada', L: 'Bancada em L', U: 'Bancada em U' }[d.forma]), acabamento: d.saiaTipo === '45' && g.arestas.some(function (e) { return e.tipo === 'saia'; }) ? '45' : '', sv: sv.sv, cuba: sv.cuba, cubaInst: sv.cubaInst, pecas: pcs.map(function (p) { return { qtd: p.qtd, comp_cm: p.c, larg_cm: p.l, rot: p.nome, tipoP: p.tipo }; }) }];
        return api('/bot/desenho', { pid: ped ? ped.id : '', nome: d.cliente || (ped && ped.nome) || 'Projeto', png: png, usarPecas: usar, itens: itens, para: para, legenda: (d.material ? d.material + ' · ' : '') + 'medidas em cm.' + (d.obs ? ' ' + d.obs : '') });
      }).then(function (r) { d.pid = ped ? ped.id : d.pid; guardar(d); aviso('✅ ' + (r.trocou ? 'Peças do pedido atualizadas. ' : '') + (r.enviados.length ? 'Enviado a ' + r.enviados.join(', ') + '. ' : '') + (r.fora.length ? 'Fora das 24 h: ' + r.fora.join(', ') + ' (avisados para pedir).' : '') + (r.erro ? ' ' + r.erro : '')); });
    }).catch(function (e) { aviso('⚠️ ' + e.message); });
  }
  function abrir() {
    css(); var v = document.getElementById('hrDes'); if (v) v.remove(); st.tela = 'lista';
    var el = document.createElement('div'); el.id = 'hrDes';
    el.innerHTML = '<div class="des-top"><button class="des-ic" data-acao="voltar">←</button><div style="flex:1;"><b>📐 Desenho técnico</b><div class="des-sub" id="desSub"></div></div></div><div class="des-main" id="desMain"></div>';
    document.body.appendChild(el);
    el.addEventListener('input', function (e) { var t = e.target.closest('[data-f]'); if (!t || st.tela !== 'editor') return; lerCampo(t); desenharCv(); if (t.tagName !== 'TEXTAREA' && !t.closest('[data-rc]')) { clearTimeout(st.tm); st.tm = setTimeout(atualizarLista, 600); } });
    el.addEventListener('change', function (e) { var t = e.target.closest('select[data-f]'); if (t) { lerCampo(t); desenharCv(); atualizarLista(); } });
    el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-acao]'), fm = e.target.closest('[data-forma]'), bd = e.target.closest('[data-borda]'), ad = e.target.closest('[data-addrc]'), rm = e.target.closest('[data-rmrc]'), ab = e.target.closest('[data-abre]'), d = st.d;
      if (bd) { var i = +bd.getAttribute('data-borda'), atual = geo(d).arestas[i].tipo; d.bordas[i] = { livre: 'parede', parede: 'saia', saia: 'livre' }[atual]; desenharCv(); atualizarLista(); return; }
      if (fm) { d.forma = fm.getAttribute('data-forma'); d.bordas = {}; d.recortes.forEach(function (r) { if (!geo(d).pecas.some(function (p) { return p.k === r.peca; })) r.peca = 'A'; }); telaEditor(); return; }
      if (ad) { var t = ad.getAttribute('data-addrc'), pad = { cuba: [50, 40], cooktop: [56, 49], rebaixo: [80, 40], furo: [3.5, 3.5] }[t]; d.recortes.push({ tipo: t, peca: 'A', x: 40, w: pad[0], h: pad[1], inst: 'embutida', frente: 0 }); desenharCv(); atualizarLista(); return; }
      if (rm) { d.recortes.splice(+rm.getAttribute('data-rmrc'), 1); desenharCv(); atualizarLista(); return; }
      if (ab) { var x = lista().filter(function (y) { return y.id === ab.getAttribute('data-abre'); })[0]; if (x) { st.d = x; st.tela = 'editor'; render(); } return; }
      if (!a) return; var k = a.getAttribute('data-acao');
      if (k === 'voltar') { if (st.tela === 'editor') { guardar(st.d); st.tela = 'lista'; render(); } else el.remove(); return; }
      if (k === 'novo') { st.d = novo(); st.tela = 'editor'; render(); return; }
      if (k === 'salvar') { guardar(d); aviso('💾 Desenho salvo'); return; }
      if (k === 'png') { guardar(d); pngDe(d).then(function (b) { var nome = 'Desenho ' + (d.cliente || 'HR') + '.png', f = new File([b], nome, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: nome }).catch(function () {}); var u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = nome; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }).catch(function (er) { aviso('⚠️ ' + er.message); }); return; }
      if (k === 'prod') { guardar(d); enviarProducao(); return; }
    });
    window.addEventListener('resize', function () { if (st.tela === 'editor') desenharCv(); });
    render();
  }
  function cartaoSec() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-des-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'des-card-sec'; b.setAttribute('data-des-btn', '1');
    b.innerHTML = '<span class="ic">📐</span><div style="flex:1;"><div class="t">Desenho técnico</div><div class="s">Bancada reta, L ou U com medidas reais, cotas, recortes e lista de peças</div></div><span style="color:#60a5fa;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-prd-btn]') || sb.querySelector('[data-dsm-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.appendChild(b);
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartaoSec(); new MutationObserver(cartaoSec).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirDesenho = abrir; window.__hrDesTeste = { geo: geo, listaPecas: listaPecas, fichaSvg: fichaSvg, novo: novo, st: st };
})();
