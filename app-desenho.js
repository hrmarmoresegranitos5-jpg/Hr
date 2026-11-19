// app-desenho.js — v2: 📐 Projeto 2D sob medida (no padrão dos desenhos da HR)
// Folha retrato com o cabeçalho verde da HR (Cliente, Descrição, Material), peças em perspectiva com traço cinza,
// medidas grandes em verde junto das bordas e as observações embaixo (centro da cuba, rebaixo, saias, frontões).
// Várias peças na mesma folha: pia reta, cozinha em L, lavatório, prateleira, nicho e placas (divisória etc.).
// Sai a lista de peças sozinha e manda para a produção pelo bot (cada peça vira um item com as suas etapas).
(function () {
  'use strict';
  if (window.__hrDes) return; window.__hrDes = true;
  var KEY = 'hr_desenhos', st = { tela: 'lista', d: null, aberta: 0 };
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr(j) { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} if (j) h['Content-Type'] = 'application/json'; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : (d || 0); }
  function vazio(v) { return v == null || String(v).trim() === ''; }
  function f1(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function api(rota, corpo) {
    if (!base()) return Promise.reject(new Error('Configure o bot (Secretária → Configurar).'));
    return fetch(base() + rota, corpo ? { method: 'POST', headers: hdr(true), body: JSON.stringify(corpo) } : { headers: hdr() }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.erro || j.error || 'Erro ' + r.status); return j; });
    });
  }

  // ── dados ──
  var TIPOS = {
    bancada: { n: 'Pia / bancada reta', ic: '▬' }, L: { n: 'Cozinha em L', ic: '⌐' }, lavatorio: { n: 'Lavatório', ic: '🚰' },
    prateleira: { n: 'Prateleira', ic: '═' }, nicho: { n: 'Nicho', ic: '⧈' }, placa: { n: 'Placa / divisória', ic: '▯' }
  };
  var SAIAS = [['reta', 'Reta'], ['slim', 'Slim'], ['45', 'Em 45°'], ['boleada', 'Boleada'], ['nenhuma', 'Sem saia']];
  var CUBAS = [['nenhuma', 'Sem cuba'], ['retangular', 'Retangular'], ['redonda', 'Redonda'], ['oval', 'Oval'], ['esculpida', 'Esculpida'], ['rampada', 'Esculpida rampada']];
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function novaPeca(t) {
    var p = { id: uid(), tipo: t, nome: '', qtd: 1, A: 200, p: 60, B: 160, pB: 60, perna: 'dir', emenda: 'principal', saia: 'reta', saiaAlt: 4, fr: 10, frF: true, frE: false, frD: false, vista: 0,
      cuba: { tipo: 'nenhuma', inst: 'embutida', ref: 'esq', x: '', w: 56, h: 34, fy: '' }, reb: { on: false, c: 121, l: 48, x: '' }, cook: { on: false, x: '', w: 56, h: 49 }, pe: 'nenhum', peAlt: 90, H: 40, prof: 10, obs: '' };
    if (t === 'bancada') { p.cuba.tipo = 'retangular'; }
    if (t === 'L') { p.A = 250; p.B = 160; p.cuba.tipo = 'retangular'; p.frD = true; }
    if (t === 'lavatorio') { p.A = 80; p.p = 45; p.saiaAlt = 10; p.cuba = { tipo: 'redonda', inst: 'embutida', ref: 'esq', x: '', w: 40, h: 40, fy: '' }; }
    if (t === 'prateleira') { p.A = 80; p.p = 35; p.frF = false; }
    if (t === 'nicho') { p.A = 60; p.H = 30; p.prof = 10; p.saia = 'nenhuma'; p.frF = false; }
    if (t === 'placa') { p.A = 40; p.H = 80; p.nome = 'Divisória'; p.saia = 'nenhuma'; p.frF = false; }
    return p;
  }
  function novo() { return { v: 2, id: 'd' + Date.now(), cliente: '', desc: '', material: '', obs: '', pid: '', pecas: [novaPeca('L')] }; }
  function migrar(d) { // desenhos da v1 (forma/A/B/recortes)
    if (!d || d.v === 2) return d;
    var p = novaPeca(d.forma === 'reta' ? 'bancada' : 'L'); p.A = num(d.A, 200); p.p = num(d.p, 60); p.B = num(d.B, 95); p.fr = num(d.frAlt, 10); p.saia = d.saiaTipo || 'reta'; p.saiaAlt = num(d.saiaAlt, 4);
    var cb = (d.recortes || []).filter(function (r) { return r.tipo === 'cuba'; })[0], rb = (d.recortes || []).filter(function (r) { return r.tipo === 'rebaixo'; })[0], ck = (d.recortes || []).filter(function (r) { return r.tipo === 'cooktop'; })[0];
    p.cuba.tipo = cb ? 'retangular' : 'nenhuma'; if (cb) { p.cuba.inst = cb.inst || 'embutida'; p.cuba.w = num(cb.w, 50); p.cuba.h = num(cb.h, 40); p.cuba.x = num(cb.x) + num(cb.w) / 2; }
    if (rb) { p.reb = { on: true, c: num(rb.w, 121), l: num(rb.h, 48), x: num(rb.x) }; }
    if (ck) { p.cook = { on: true, x: num(ck.x) + num(ck.w) / 2, w: num(ck.w, 56), h: num(ck.h, 49) }; }
    return { v: 2, id: d.id, cliente: d.cliente || '', desc: d.desc || '', material: d.material || '', obs: d.obs || '', pid: d.pid || '', em: d.em, pecas: [p] };
  }
  function lista() { try { return (JSON.parse(localStorage.getItem(KEY) || '[]') || []).map(migrar); } catch (e) { return []; } }
  function guardar(d) { var l = lista().filter(function (x) { return x.id !== d.id; }); d.em = Date.now(); l.unshift(JSON.parse(JSON.stringify(d))); try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 80))); } catch (e) {} }
  function apagar(id) { try { localStorage.setItem(KEY, JSON.stringify(lista().filter(function (x) { return x.id !== id; }))); } catch (e) {} }

  function oblq(pc) { return ['bancada', 'L', 'lavatorio', 'prateleira'].indexOf(pc.tipo) >= 0; }
  function temSaia(pc) { return pc.saia !== 'nenhuma' && num(pc.saiaAlt) > 0; }
  function nomePeca(pc) {
    if (!vazio(pc.nome)) return String(pc.nome).trim();
    return { bancada: 'Pia', L: 'Cozinha em L', lavatorio: 'Lavatório', prateleira: 'Prateleira', nicho: 'Nicho', placa: 'Placa' }[pc.tipo] || 'Peça';
  }

  // ── geometria (x: comprimento, da esquerda; y: profundidade, 0 = frente; z: altura) ──
  function geo(pc) {
    var A = Math.max(5, num(pc.A, 100)), p = Math.max(5, num(pc.p, 60)), T = temSaia(pc) ? num(pc.saiaAlt) : 2, bx = [], Ymax = p, yAt = { e: 0, d: 0 };
    if (pc.tipo === 'L') {
      var B = Math.max(p + 5, num(pc.B, 160)), pB = Math.min(A - 5, Math.max(5, num(pc.pB, p))), dir = pc.perna !== 'esq', prn = pc.emenda === 'perna';
      Ymax = B;
      if (dir) {
        bx.push({ k: 'main', x0: 0, x1: prn ? A - pB : A, y0: B - p, y1: B });
        bx.push({ k: 'perna', x0: A - pB, x1: A, y0: 0, y1: prn ? B : B - p });
        yAt = { e: B - p, d: 0 };
      } else {
        bx.push({ k: 'main', x0: prn ? pB : 0, x1: A, y0: B - p, y1: B });
        bx.push({ k: 'perna', x0: 0, x1: pB, y0: 0, y1: prn ? B : B - p });
        yAt = { e: 0, d: B - p };
      }
    } else bx.push({ k: 'main', x0: 0, x1: A, y0: 0, y1: p });
    bx.forEach(function (b) { b.z0 = 0; b.z1 = T; b.g = 'slab'; });
    var fr = num(pc.fr), fe = 2;
    if (fr > 0 && pc.tipo !== 'prateleira') {
      if (pc.frF) bx.push({ k: 'frF', g: 'fr', x0: 0, x1: A, y0: Ymax - fe, y1: Ymax, z0: T, z1: T + fr });
      if (pc.frE) bx.push({ k: 'frE', g: 'fr', x0: 0, x1: fe, y0: yAt.e, y1: pc.frF ? Ymax - fe : Ymax, z0: T, z1: T + fr });
      if (pc.frD) bx.push({ k: 'frD', g: 'fr', x0: A - fe, x1: A, y0: yAt.d, y1: pc.frF ? Ymax - fe : Ymax, z0: T, z1: T + fr });
    }
    if (pc.pe === 'dir' || pc.pe === 'esq') { var pa = Math.max(10, num(pc.peAlt, 90)), y0p = pc.pe === 'dir' ? yAt.d : yAt.e; bx.push({ k: 'pe', g: 'pe', x0: pc.pe === 'dir' ? A - 3 : 0, x1: pc.pe === 'dir' ? A : 3, y0: y0p, y1: y0p + p, z0: T - pa, z1: 0 }); }
    var main = bx[0];
    return { A: A, p: p, T: T, Ymax: Ymax, boxes: bx, main: main, yAt: yAt };
  }
  // posições dos recortes no tampo principal
  function recortes(pc, g) {
    var m = g.main, L = [], A = g.A, p = g.p, c = pc.cuba || {}, rb = pc.reb || {}, ck = pc.cook || {};
    var xRef = function (v, ref) { return ref === 'dir' ? A - v : v; };
    var meioX = (m.x0 + m.x1) / 2, rebR = null;
    if (rb.on && oblq(pc) && pc.tipo !== 'prateleira') {
      var rc = Math.max(10, num(rb.c, 121)), rl = Math.min(p - 4, Math.max(10, num(rb.l, 48))), rx0;
      if (!vazio(rb.x)) rx0 = num(rb.x);
      else if (c.tipo !== 'nenhuma' && !vazio(c.x)) rx0 = xRef(num(c.x), c.ref) - rc / 2;
      else rx0 = meioX - rc / 2;
      rebR = { t: 'reb', x0: rx0, x1: rx0 + rc, y0: m.y1 - 2 - rl, y1: m.y1 - 2 };
      L.push(rebR);
    }
    if (c.tipo && c.tipo !== 'nenhuma' && pc.tipo !== 'prateleira') {
      var w = Math.max(5, num(c.w, 40)), h = Math.max(5, num(c.h, w)), cx;
      if (c.tipo === 'redonda') h = w;
      cx = !vazio(c.x) ? xRef(num(c.x), c.ref) : rebR ? (rebR.x0 + rebR.x1) / 2 : meioX;
      var cy = !vazio(c.fy) ? m.y0 + num(c.fy) : rebR ? (rebR.y0 + rebR.y1) / 2 : (m.y0 + m.y1) / 2;
      L.push({ t: 'cuba', f: c.tipo, inst: c.inst, x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, cx: cx, cy: cy });
    }
    if (ck.on && pc.tipo !== 'prateleira') {
      var kw = Math.max(10, num(ck.w, 56)), kh = Math.max(10, num(ck.h, 49)), kx = !vazio(ck.x) ? num(ck.x) : m.x0 + 20 + kw / 2;
      L.push({ t: 'cook', x0: kx - kw / 2, x1: kx + kw / 2, y0: (m.y0 + m.y1) / 2 - kh / 2, y1: (m.y0 + m.y1) / 2 + kh / 2, cx: kx });
    }
    return L;
  }
  function avisos(pc) {
    if (!oblq(pc)) return [];
    var g = geo(pc), R = recortes(pc, g), m = g.main, out = [], nm = { reb: 'O rebaixo', cuba: 'A cuba', cook: 'O cooktop' };
    R.forEach(function (r) {
      if (r.x0 < 3 || r.x1 > g.A - 3 || r.y0 < m.y0 + 2 || r.y1 > m.y1 - 1) out.push(nm[r.t] + ' passa da borda da pedra — confira a medida.');
      else if (r.x0 < m.x0 + 3 || r.x1 > m.x1 - 3) out.push(nm[r.t] + ' passa pela emenda do L — em "Quem fica com o canto", troque para ' + (pc.emenda === 'perna' ? 'Fundo' : 'Perna') + ' ou mude a posição.');
    });
    var cb = R.filter(function (r) { return r.t === 'cuba'; })[0], rb = R.filter(function (r) { return r.t === 'reb'; })[0], ck = R.filter(function (r) { return r.t === 'cook'; })[0];
    if (cb && rb && (cb.x0 < rb.x0 || cb.x1 > rb.x1 || cb.y0 < rb.y0 || cb.y1 > rb.y1)) out.push('A cuba não cabe dentro do rebaixo.');
    var bate = function (a, b) { return a && b && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1; };
    if (bate(ck, cb)) out.push('O cooktop está em cima da cuba.'); else if (bate(ck, rb)) out.push('O cooktop está em cima do rebaixo.');
    if (ck && cb && !bate(ck, cb) && Math.min(Math.abs(ck.x0 - cb.x1), Math.abs(cb.x0 - ck.x1)) < 15) out.push('Cooktop e cuba muito perto (menos de 15 cm).');
    return out;
  }

  // ── projeção oblíqua (como os seus desenhos) ──
  var KC = 0.38, KS = 0.6;
  function sentido(pc) { if (+pc.vista) return +pc.vista; return pc.tipo === 'L' ? (pc.perna === 'esq' ? 1 : -1) : 1; }
  function pj(x, y, z, c) { var tz = z; return [x + c * y, -(tz + KS * y)]; }
  function zv(z, T) { return z <= 0 ? z : z <= T ? z * T2(T) / T : T2(T) + (z - T); } // espessura um pouco exagerada p/ ler
  function T2(T) { return Math.max(T, 5); }
  function proj(pc, g) {
    var c = KC * sentido(pc), T = g.T;
    return function (x, y, z) { return pj(x, y, zv(z, T), c); };
  }
  function bboxOb(pc) {
    var g = geo(pc), P = proj(pc, g), xs = [], ys = [];
    g.boxes.forEach(function (b) { [b.x0, b.x1].forEach(function (x) { [b.y0, b.y1].forEach(function (y) { [b.z0, b.z1].forEach(function (z) { var q = P(x, y, z); xs.push(q[0]); ys.push(q[1]); }); }); }); });
    return { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) };
  }
  function bboxPeca(pc) {
    if (oblq(pc)) { var b = bboxOb(pc); return { w: b.x1 - b.x0, h: b.y1 - b.y0, mL: 78, mR: 78, mT: 62, mB: pc.tipo === 'L' || num(pc.qtd) > 1 ? 58 : 18 }; }
    var A = Math.max(5, num(pc.A)), H = Math.max(5, num(pc.H));
    return pc.tipo === 'nicho' ? { w: A + 16, h: H + 16, mL: 20, mR: 50, mT: 20, mB: 20 } : { w: A, h: H, mL: 20, mR: 70, mT: 20, mB: 50 };
  }

  // ── desenho de uma peça em perspectiva ──
  var COR = { tr: '#4a4a52', vd: '#4d6b54', am: '#d9b23a', az: '#5bc0d6' };
  function poly(pts, extra) { return '<polygon points="' + pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" ' + (extra || 'fill="#fff"') + '/>'; }
  function txt(x, y, t, fs, anc, cor, extra) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs + '" text-anchor="' + (anc || 'middle') + '" fill="' + (cor || COR.vd) + '"' + (extra || '') + '>' + esc(t) + '</text>'; }
  function antes(a, b, c) { // a fica atrás de b?
    var yov = a.y0 < b.y1 && b.y0 < a.y1;
    if (!yov) return a.y0 >= b.y1;
    var xov = a.x0 < b.x1 && b.x0 < a.x1;
    if (!xov) return c > 0 ? a.x1 <= b.x0 : a.x0 >= b.x1;
    return a.z1 <= b.z0;
  }
  function ordenar(L, c) { var r = L.slice(); for (var i = 0; i < r.length; i++) for (var j = i + 1; j < r.length; j++) if (antes(r[j], r[i], c) && !antes(r[i], r[j], c)) { var t = r[i]; r[i] = r[j]; r[j] = t; } return r; }
  function caixa(b, P, c, s, ox, oy, sw) {
    var S = function (x, y, z) { var q = P(x, y, z); return [ox + q[0] * s, oy + q[1] * s]; }, h = '', st = 'fill="#fff" stroke="' + COR.tr + '" stroke-width="' + sw + '" stroke-linejoin="round"';
    var xs = c > 0 ? b.x1 : b.x0;
    h += poly([S(xs, b.y0, b.z0), S(xs, b.y1, b.z0), S(xs, b.y1, b.z1), S(xs, b.y0, b.z1)], st);
    h += poly([S(b.x0, b.y0, b.z0), S(b.x1, b.y0, b.z0), S(b.x1, b.y0, b.z1), S(b.x0, b.y0, b.z1)], st);
    h += poly([S(b.x0, b.y0, b.z1), S(b.x1, b.y0, b.z1), S(b.x1, b.y1, b.z1), S(b.x0, b.y1, b.z1)], st);
    return h;
  }
  var nClip = 0;
  function recorteSvg(r, P, s, ox, oy, z, sw) {
    var S = function (x, y, zz) { var q = P(x, y, zz == null ? z : zz); return [ox + q[0] * s, oy + q[1] * s]; }, h = '', ln = 'fill="none" stroke="' + COR.tr + '" stroke-width="' + sw + '" stroke-linejoin="round"';
    var ret = [S(r.x0, r.y0), S(r.x1, r.y0), S(r.x1, r.y1), S(r.x0, r.y1)];
    var circ = function (cx, cy, rx, ry, zz) { var pts = []; for (var i = 0; i < 48; i++) { var a = i / 48 * Math.PI * 2; pts.push(S(cx + rx * Math.cos(a), cy + ry * Math.sin(a), zz)); } return pts; };
    var bacia = function (dz, so) { // furo com fundo: parede de trás e lateral aparecem por dentro
      var id = 'hrc' + (++nClip), x0 = r.x0, x1 = r.x1, y0 = r.y0, y1 = r.y1;
      if (so) { y0 = r.y1 - Math.max(5, (r.y1 - r.y0) * 0.22); x0 = r.x0 + (r.x1 - r.x0) * 0.08; x1 = r.x1 - (r.x1 - r.x0) * 0.08; }
      var fundo = [S(x0, y0, z - dz), S(x1, y0, z - dz), S(x1, y1, z - dz), S(x0, y1, z - dz)], g2 = '<clipPath id="' + id + '">' + poly(ret, '') + '</clipPath><g clip-path="url(#' + id + ')">';
      g2 += poly(fundo, ln);
      if (so) { g2 += '<line x1="' + ret[0][0] + '" y1="' + ret[0][1] + '" x2="' + fundo[0][0] + '" y2="' + fundo[0][1] + '" ' + ln + '/>' + '<line x1="' + ret[1][0] + '" y1="' + ret[1][1] + '" x2="' + fundo[1][0] + '" y2="' + fundo[1][1] + '" ' + ln + '/>'; }
      else [0, 1, 2, 3].forEach(function (i) { g2 += '<line x1="' + ret[i][0] + '" y1="' + ret[i][1] + '" x2="' + fundo[i][0] + '" y2="' + fundo[i][1] + '" ' + ln + '/>'; });
      return g2 + '</g>' + poly(ret, ln);
    };
    if (r.t === 'reb') {
      var id = 'hrc' + (++nClip), deg = [S(r.x0, r.y0, z - 2.2), S(r.x1, r.y0, z - 2.2), S(r.x1, r.y1, z - 2.2), S(r.x0, r.y1, z - 2.2)];
      h += '<clipPath id="' + id + '">' + poly(ret, '') + '</clipPath><g clip-path="url(#' + id + ')">' + poly(deg, ln) + '</g>';
      h += poly(ret, 'fill="none" stroke="' + COR.tr + '" stroke-width="' + (sw * 1.45) + '" stroke-linejoin="round"');
    } else if (r.t === 'cook') {
      h += poly(ret, ln);
      var bw = (r.x1 - r.x0), bh = (r.y1 - r.y0);
      [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(function (k) { h += poly(circ(r.x0 + bw * k[0], r.y0 + bh * k[1], bw * 0.12, bw * 0.12), ln); });
    } else if (r.t === 'cuba') {
      if (r.f === 'redonda' || r.f === 'oval') {
        var rx = (r.x1 - r.x0) / 2, ry = (r.y1 - r.y0) / 2;
        h += poly(circ(r.cx, r.cy, rx, ry), ln);
        if (r.inst === 'sobrepor') h += poly(circ(r.cx, r.cy, rx * 0.84, ry * 0.84), ln);
      } else if (r.f === 'esculpida' || r.f === 'rampada') h += bacia(12, r.f === 'rampada');
      else { h += bacia(5); if (r.inst === 'sobrepor') { var g = 2.2; h += poly([S(r.x0 - g, r.y0 - g), S(r.x1 + g, r.y0 - g), S(r.x1 + g, r.y1 + g), S(r.x0 - g, r.y1 + g)], ln); } }
    }
    return h;
  }
  function pecaSvg(pc, s, cx0, cy0) { // cx0/cy0: canto sup. esq. da área útil da peça (sem margens)
    var g = geo(pc), P = proj(pc, g), c = KC * sentido(pc), bb = bboxOb(pc), ox = cx0 - bb.x0 * s, oy = cy0 - bb.y0 * s, sw = Math.max(1.6, Math.min(3, s * 0.55)), h = '';
    var S = function (x, y, z) { var q = P(x, y, z); return [ox + q[0] * s, oy + q[1] * s]; };
    var R = recortes(pc, g);
    var grp = function (gg) { return g.boxes.filter(function (b) { return b.g === gg; }); };
    ordenar(grp('pe'), c).forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); });
    ordenar(grp('slab'), c).forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); if (b.k === 'main') R.forEach(function (r) { h += recorteSvg(r, P, s, ox, oy, g.T, sw * 0.85); }); });
    ordenar(grp('fr'), c).forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); });
    // medidas (números verdes, como à mão)
    var fs = 40, fs2 = 34, m = g.main, frH = num(pc.fr) > 0 && pc.frF && pc.tipo !== 'prateleira' ? num(pc.fr) : 0;
    var topo = S((0 + g.A) / 2, g.Ymax, g.T + frH);
    h += txt(topo[0], topo[1] - 22, f1(g.A), fs);
    var ladoEsq = pc.tipo !== 'L' || pc.perna !== 'esq';
    if (pc.tipo === 'L') {
      var dir = pc.perna !== 'esq', xo = dir ? g.A : 0, a1 = S(xo, 0, 0), a2 = S(xo, g.Ymax, 0), mx = (a1[0] + a2[0]) / 2, my = (a1[1] + a2[1]) / 2;
      h += txt(mx + (dir ? 34 : -34), my, f1(num(pc.B)), fs, dir ? 'start' : 'end');
      var xe = dir ? 0 : g.A, b1 = S(xe, g.Ymax - g.p, 0), b2 = S(xe, g.Ymax, 0);
      h += txt((b1[0] + b2[0]) / 2 + (dir ? -30 : 30), (b1[1] + b2[1]) / 2 + 12, f1(g.p), fs2, dir ? 'end' : 'start');
      var pB = Math.min(g.A - 5, num(pc.pB, g.p)), f0 = S(dir ? g.A - pB : 0, 0, 0), f2 = S(dir ? g.A : pB, 0, 0);
      h += txt((f0[0] + f2[0]) / 2, Math.max(f0[1], f2[1]) + 46, f1(pB), fs2);
    } else {
      var e1 = S(ladoEsq ? 0 : g.A, 0, 0), e2 = S(ladoEsq ? 0 : g.A, g.p, g.T);
      var lx = Math.min(e1[0], e2[0]), ly = (e1[1] + e2[1]) / 2 + 12;
      h += txt(lx - 22, ly, f1(g.p), fs, 'end');
    }
    if (num(pc.qtd) > 1) { var q1 = S(g.A / 2, 0, 0); h += txt(q1[0], q1[1] + 48, num(pc.qtd) + 'x', fs2, 'middle', COR.vd, ' font-weight="700"'); }
    return h;
  }
  function frenteSvg(pc, s, x0, y0) { // nicho e placas: vista de frente
    var A = Math.max(5, num(pc.A)), H = Math.max(5, num(pc.H)), sw = Math.max(1.6, Math.min(3, s * 0.55)), h = '', st = 'fill="#fff" stroke="' + COR.tr + '" stroke-width="' + sw + '"';
    if (pc.tipo === 'nicho') {
      var m = 8, pr = Math.max(4, num(pc.prof, 10)), X = x0 + m * s, Y = y0 + m * s, W = A * s, Hh = H * s, d = Math.min(pr * 0.45, A * 0.2) * s, b = Math.min(pr * 0.45, H * 0.2) * s;
      h += '<rect x="' + x0 + '" y="' + y0 + '" width="' + ((A + 2 * m) * s) + '" height="' + ((H + 2 * m) * s) + '" ' + st + '/>';
      h += '<rect x="' + X + '" y="' + Y + '" width="' + W + '" height="' + Hh + '" ' + st + '/>';
      h += '<line x1="' + (X + W - d) + '" y1="' + (Y) + '" x2="' + (X + W - d) + '" y2="' + (Y + Hh - b) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += '<line x1="' + (X) + '" y1="' + (Y + Hh - b) + '" x2="' + (X + W - d) + '" y2="' + (Y + Hh - b) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += '<line x1="' + (X + W - d) + '" y1="' + (Y + Hh - b) + '" x2="' + (X + W) + '" y2="' + (Y + Hh) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += txt(X + 14, Y + Hh / 2 + 10, f1(H), 30, 'start') + txt(X + W / 2, Y + Hh - b - 14, f1(A), 30);
      h += txt(X + W + m * s + 10, Y + Hh / 2 + 8, '↔ ' + f1(pr), 24, 'start');
      if (num(pc.qtd) > 1) h += txt(X + W / 2, Y + Hh / 2, num(pc.qtd) + 'x', 30);
    } else {
      h += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (A * s) + '" height="' + (H * s) + '" ' + st + '/>';
      h += txt(x0 + A * s / 2, y0 + H * s / 2, nomePeca(pc), 26) + (num(pc.qtd) > 1 ? txt(x0 + A * s / 2, y0 + H * s / 2 + 40, num(pc.qtd) + 'x', 26) : '');
      h += txt(x0 + A * s + 12, y0 + H * s / 2 + 10, f1(H), 28, 'start') + txt(x0 + A * s / 2, y0 + H * s + 38, f1(A), 28);
    }
    return h;
  }

  // ── textos automáticos ──
  var NSAIA = { reta: 'sainhas retas', slim: 'sainhas slim', '45': 'sainhas em 45°', boleada: 'sainhas boleadas' };
  function descAuto(d) {
    var ps = d.pecas || [];
    if (ps.length === 1) {
      var pc = ps[0], c = pc.cuba || {}, x = [];
      if (oblq(pc) && temSaia(pc)) x.push(NSAIA[pc.saia]);
      if (pc.reb && pc.reb.on) x.push('rebaixo americano');
      if (c.tipo && c.tipo !== 'nenhuma' && pc.tipo !== 'prateleira') x.push(c.tipo === 'esculpida' ? 'cuba esculpida' : c.tipo === 'rampada' ? 'cuba esculpida rampada' : 'cuba ' + (c.tipo === 'retangular' ? '' : c.tipo + ' ') + (c.inst === 'sobrepor' ? 'de sobrepor' : c.inst === 'flush' ? 'flush' : 'embutida'));
      if (pc.cook && pc.cook.on) x.push('cooktop');
      if (num(pc.fr) > 0 && (pc.frF || pc.frE || pc.frD) && pc.tipo !== 'prateleira') x.push('frontões de ' + f1(num(pc.fr)) + 'cm');
      if (pc.pe !== 'nenhum') x.push('pé estrutural');
      var b = (num(pc.qtd) > 1 ? num(pc.qtd) + ' ' : '') + nomePeca(pc);
      return b + (x.length ? ' com ' + (x.length > 1 ? x.slice(0, -1).join(', ') + ' e ' + x[x.length - 1] : x[0]) : '');
    }
    var cnt = {}, ord = [];
    ps.forEach(function (pc) { var n = nomePeca(pc).toLowerCase().replace(/ em l$/, ' em L'), q = Math.max(1, num(pc.qtd, 1)); if (!cnt[n]) { cnt[n] = 0; ord.push(n); } cnt[n] += q; });
    var t = ord.map(function (n) { var q = cnt[n], fem = /(a|ão|ória|ória s|eira)s?$/.test(n) && !/lavat/.test(n); return q > 1 ? (q === 2 ? (fem ? 'duas ' : 'dois ') : q === 3 ? 'três ' : q + ' ') + (/s$/.test(n) ? n : /m$/.test(n) ? n.replace(/m$/, 'ns') : /ão$/.test(n) ? n.replace(/ão$/, 'ões') : /[aeiouó]$/.test(n) ? n + 's' : /l$/.test(n) ? n.replace(/l$/, 'is') : n + 'es') : n; });
    var s = t.length > 1 ? t.slice(0, -1).join(', ') + ' e ' + t[t.length - 1] : t[0] || '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function notas(d) {
    var L = [], ps = d.pecas || [], varias = ps.length > 1;
    ps.forEach(function (pc) {
      if (!oblq(pc)) return;
      var g = geo(pc), R = recortes(pc, g), pre = varias ? nomePeca(pc) + ': ' : '', n = [];
      var cb = R.filter(function (r) { return r.t === 'cuba'; })[0], rb = R.filter(function (r) { return r.t === 'reb'; })[0], ck = R.filter(function (r) { return r.t === 'cook'; })[0], c = pc.cuba || {};
      if (rb) n.push('Rebaixo americano ' + f1(rb.x1 - rb.x0) + 'x' + f1(rb.y1 - rb.y0) + ', início a ' + f1(rb.x0) + ' do canto esquerdo');
      if (cb) {
        var dsq = c.ref === 'dir' ? g.A - cb.cx : cb.cx, lado = c.ref === 'dir' ? 'direito' : 'esquerdo';
        if (rb && vazio(c.x)) n.push('Cuba no centro do rebaixo');
        else if (!vazio(c.x) || pc.tipo === 'L' || g.A > 100) n.push('Centro da cuba: ' + f1(dsq) + ' do canto ' + lado);
        if (cb.f !== 'redonda' && cb.f !== 'oval') n.push('Cuba ' + f1(cb.x1 - cb.x0) + 'x' + f1(cb.y1 - cb.y0) + (cb.f === 'rampada' ? ' esculpida rampada' : cb.f === 'esculpida' ? ' esculpida' : c.inst === 'flush' ? ' flush' : c.inst === 'sobrepor' ? ' de sobrepor' : ''));
        else n.push('Cuba ' + (cb.f === 'redonda' ? 'redonda Ø ' + f1(cb.x1 - cb.x0) : 'oval ' + f1(cb.x1 - cb.x0) + 'x' + f1(cb.y1 - cb.y0)) + (c.inst === 'sobrepor' ? ' de sobrepor' : ''));
      }
      if (ck) n.push('Cooktop ' + f1(ck.x1 - ck.x0) + 'x' + f1(ck.y1 - ck.y0) + ', centro a ' + f1(ck.cx) + ' do canto esquerdo');
      if (temSaia(pc)) n.push('Sainha ' + ({ reta: 'reta', slim: 'slim', '45': 'em 45°', boleada: 'boleada' }[pc.saia]) + ' de ' + f1(num(pc.saiaAlt)) + 'cm');
      if (num(pc.fr) > 0 && (pc.frF || pc.frE || pc.frD) && pc.tipo !== 'prateleira') n.push('Frontão de ' + f1(num(pc.fr)) + 'cm');
      if (pc.pe !== 'nenhum') n.push('Pé estrutural de ' + f1(num(pc.peAlt)) + 'cm no lado ' + (pc.pe === 'dir' ? 'direito' : 'esquerdo'));
      if (!vazio(pc.obs)) n.push(String(pc.obs).trim());
      if (n.length) L.push(pre + n.join(' · '));
    });
    if (!vazio(d.obs)) String(d.obs).split(/\n+/).forEach(function (x) { if (x.trim()) L.push(x.trim()); });
    return L;
  }
  function quebra(t, max) { var out = [], l = ''; String(t).split(/\s+/).forEach(function (w) { if ((l + ' ' + w).trim().length > max && l) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); }); if (l) out.push(l); return out; }

  // ── folha (1131 × 1600, igual às suas) ──
  var FW = 1131, FH = 1600, FONTE = "Roboto, 'Segoe UI', Arial, sans-serif";
  function layout(ps, x0, y0, W, H) {
    var bbs = ps.map(bboxPeca), best = null;
    [1, 2, 3].forEach(function (cols) {
      if (cols > ps.length) return;
      var rows = []; for (var i = 0; i < ps.length; i += cols) rows.push(bbs.slice(i, i + cols).map(function (b, k) { return i + k; }));
      var sH = H - rows.reduce(function (t, r) { return t + Math.max.apply(0, r.map(function (i) { return bbs[i].mT + bbs[i].mB; })) + 16; }, 0), hcm = rows.reduce(function (t, r) { return t + Math.max.apply(0, r.map(function (i) { return bbs[i].h; })); }, 0);
      var s = sH / Math.max(1, hcm);
      rows.forEach(function (r) { var fx = W - r.reduce(function (t, i) { return t + bbs[i].mL + bbs[i].mR + 14; }, 0), wcm = r.reduce(function (t, i) { return t + bbs[i].w; }, 0); s = Math.min(s, fx / Math.max(1, wcm)); });
      s = Math.min(s, 7.2);
      if (!best || s > best.s * 1.08) best = { s: s, rows: rows };
    });
    var s = best.s, out = [], totH = best.rows.reduce(function (t, r) { return t + Math.max.apply(0, r.map(function (i) { return bbs[i].h * s + bbs[i].mT + bbs[i].mB; })) + 16; }, 0), y = y0 + Math.max(0, (H - totH) / 2);
    best.rows.forEach(function (r) {
      var rh = Math.max.apply(0, r.map(function (i) { return bbs[i].h * s + bbs[i].mT + bbs[i].mB; })), rw = r.reduce(function (t, i) { return t + bbs[i].w * s + bbs[i].mL + bbs[i].mR; }, 0), gap = r.length > 1 ? Math.max(14, (W - rw) / (r.length + 1)) : 0, x = r.length > 1 ? x0 + gap : x0 + (W - rw) / 2;
      r.forEach(function (i) { var b = bbs[i], ph = b.h * s + b.mT + b.mB; out[i] = { s: s, x: x + b.mL, y: y + (rh - ph) / 2 + b.mT }; x += b.w * s + b.mL + b.mR + gap; });
      y += rh + 16;
    });
    return out;
  }
  function folhaSvg(d) {
    nClip = 0;
    var h = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + FW + ' ' + FH + '" width="' + FW + '" height="' + FH + '" font-family="' + FONTE + '">';
    h += '<rect width="' + FW + '" height="' + FH + '" fill="#f6f6f4"/>';
    h += txt(FW / 2, 68, 'HR', 58) + txt(FW / 2, 143, 'Mármores e Granitos', 60) + txt(FW / 2, 214, 'Projeto 2D sob medida', 36);
    h += '<line x1="0" y1="231" x2="' + FW + '" y2="231" stroke="' + COR.tr + '" stroke-width="2.4"/>';
    var desc = vazio(d.desc) ? descAuto(d) : d.desc, dl = quebra(desc, 62).slice(0, 3), X = 240, y = 270;
    h += txt(X, y, 'Cliente: ' + (d.cliente || ''), 26, 'start'); y += 58;
    h += txt(X, y, 'Descrição:', 26, 'start'); y += 32;
    dl.forEach(function (l) { h += txt(X, y, l, 26, 'start'); y += 32; });
    y += 28; h += txt(X, y, 'Material: ' + (d.material || ''), 26, 'start');
    var yl = Math.max(457, y + 38);
    h += '<line x1="0" y1="' + yl + '" x2="' + FW + '" y2="' + yl + '" stroke="' + COR.tr + '" stroke-width="2.4"/>';
    var nt = notas(d), fsn = nt.length > 4 ? 24 : 30, linhas = [];
    nt.forEach(function (n) { quebra(n, fsn === 24 ? 80 : 64).forEach(function (l) { linhas.push(l); }); });
    linhas = linhas.slice(0, 9);
    var lh = fsn * 1.2, notasH = linhas.length ? linhas.length * lh + 30 : 20;
    var ps = (d.pecas || []).filter(function (pc) { return pc; });
    if (ps.length) {
      var ay = yl + 20, aH = FH - notasH - ay - 10, L = layout(ps, 30, ay, FW - 60, aH);
      ps.forEach(function (pc, i) { var o = L[i]; h += oblq(pc) ? pecaSvg(pc, o.s, o.x, o.y) : frenteSvg(pc, o.s, o.x, o.y); });
    }
    linhas.forEach(function (l, i) { h += txt(22, FH - 22 - (linhas.length - 1 - i) * lh, l, fsn, 'start'); });
    return h + '</svg>';
  }

  // ── lista de peças (corte) e serviços, para a produção ──
  function corte(pc) {
    var q = Math.max(1, Math.round(num(pc.qtd, 1))), L = [], add = function (nome, tipo, c, l, n) { if (c > 0 && l > 0) L.push({ nome: nome, tipo: tipo, qtd: (n || 1) * q, c: Math.round(Math.max(c, l) * 10) / 10, l: Math.round(Math.min(c, l) * 10) / 10 }); };
    if (pc.tipo === 'nicho') { var A = num(pc.A), H = num(pc.H), pr = num(pc.prof, 10); add('Nicho – base e topo', 'outro', A, pr, 2); add('Nicho – laterais', 'outro', H, pr, 2); return L; }
    if (pc.tipo === 'placa') { add(nomePeca(pc), 'outro', num(pc.A), num(pc.H)); return L; }
    var g = geo(pc), nm = nomePeca(pc);
    g.boxes.forEach(function (b) {
      if (b.g === 'slab') add(pc.tipo === 'L' ? (b.k === 'main' ? 'Bancada (parte maior)' : 'Bancada (perna do L)') : nm, 'bancada', b.x1 - b.x0, b.y1 - b.y0);
      if (b.g === 'fr') add('Frontão', 'frontao', Math.max(b.x1 - b.x0, b.y1 - b.y0), num(pc.fr));
      if (b.g === 'pe') add('Pé estrutural', 'outro', b.z1 - b.z0, b.y1 - b.y0);
    });
    if (temSaia(pc)) {
      var sa = num(pc.saiaAlt), nmS = 'Saia ' + ({ reta: 'reta', slim: 'slim', '45': 'em 45°', boleada: 'boleada' }[pc.saia]), A2 = g.A, p = g.p;
      if (pc.tipo === 'L') {
        var pB = Math.min(A2 - 5, num(pc.pB, p)), B = num(pc.B), dir = pc.perna !== 'esq';
        add(nmS, 'saia', A2 - pB, sa); add(nmS, 'saia', pB, sa); add(nmS, 'saia', B - p, sa);
        if (dir ? !pc.frE : !pc.frD) add(nmS, 'saia', p, sa);
        if (dir ? !pc.frD : !pc.frE) add(nmS, 'saia', B, sa);
      } else { add(nmS, 'saia', A2, sa); if (!pc.frE) add(nmS, 'saia', p, sa); if (!pc.frD) add(nmS, 'saia', p, sa); }
    }
    if (pc.reb && pc.reb.on) add('Tampo do rebaixo americano', 'tampo', num(pc.reb.c), num(pc.reb.l));
    return L;
  }
  function itemProducao(pc) {
    var sv = [], c = pc.cuba || {}, temC = oblq(pc) && c.tipo && c.tipo !== 'nenhuma' && pc.tipo !== 'prateleira';
    if (temC) sv.push(pc.tipo === 'lavatorio' ? 'cuba_lav' : 'cuba_coz');
    if (pc.cook && pc.cook.on) sv.push('cook');
    if (pc.reb && pc.reb.on) sv.push('reb_a');
    if (oblq(pc) && temSaia(pc)) sv.push({ reta: 's_reta', slim: 's_slim', boleada: 's_boleada', '45': 's_45' }[pc.saia] || 's_reta');
    return { ambiente: nomePeca(pc), acabamento: oblq(pc) && temSaia(pc) && pc.saia === '45' ? '45' : '', sv: sv, cuba: temC ? 'desenho' : '', cubaInst: temC ? (/esculp|rampada/.test(c.tipo) ? 'esculpida' : { embutida: 'embutir', sobrepor: 'sobrepor', flush: 'flush' }[c.inst] || '') : '',
      pecas: corte(pc).map(function (p) { return { qtd: p.qtd, comp_cm: p.c, larg_cm: p.l, rot: p.nome, tipoP: p.tipo }; }) };
  }

  function pngDe(d) {
    return new Promise(function (ok, erro) {
      var svg = folhaSvg(d), img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () { var c = document.createElement('canvas'); c.width = FW * 2; c.height = FH * 2; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : erro(new Error('Falha ao gerar a imagem')); }, 'image/png'); };
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
    + '.des-main{flex:1;overflow:auto;display:flex;flex-wrap:wrap;gap:12px;padding:12px 12px 110px;align-items:flex-start}'
    + '.des-cv{flex:1 1 360px;max-width:560px;background:#f6f6f4;border-radius:12px;overflow:hidden;position:relative;cursor:zoom-in;box-shadow:0 6px 24px rgba(0,0,0,.4)}.des-cv svg{width:100%;height:auto;display:block}'
    + '.des-cv .lupa{position:absolute;right:8px;top:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:10px;padding:4px 9px;font-size:.72rem}'
    + '@media(min-width:900px){.des-cv{position:sticky;top:0}}'
    + '.des-pn{flex:1 1 320px;max-width:560px}.des-sec{border-radius:14px;padding:12px;margin-bottom:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}'
    + '.des-sec h4{margin:0 0 8px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#c9a84c;display:flex;align-items:center;gap:8px}'
    + '.des-g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:7px}.des-g2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.des-l{font-size:.64rem;color:#9a917e;display:block;margin-bottom:2px}'
    + '.des-i,.des-s,.des-ta{width:100%;padding:9px;border-radius:10px;background:#16130e;color:#efe9dc;border:1px solid rgba(201,168,76,.25);font-size:.9rem;font-family:inherit}.des-ta{min-height:58px;resize:vertical}'
    + '.des-ch{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.des-ch button{flex:1 1 auto;padding:8px 10px;border-radius:10px;border:1px solid rgba(201,168,76,.25);background:#16130e;color:#c9bfa6;font-weight:700;font-size:.8rem;cursor:pointer}.des-ch button.on{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408}'
    + '.des-pc-h{display:flex;align-items:center;gap:8px;cursor:pointer}.des-pc-h b{flex:1;font-size:.95rem;color:#f0d78c}.des-x{background:none;border:1px solid rgba(239,68,68,.35);color:#f87171;border-radius:9px;padding:4px 9px;cursor:pointer;font-size:.75rem}'
    + '.des-bt{width:100%;padding:13px;border-radius:13px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-size:.92rem;margin-top:8px;cursor:pointer}.des-bt2{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:#f0d78c}'
    + '.des-add{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.des-add button{padding:10px 4px;border-radius:11px;border:1px dashed rgba(201,168,76,.4);background:transparent;color:#e8c96a;font-size:.76rem;font-weight:700;cursor:pointer}'
    + '.des-pc{display:flex;justify-content:space-between;font-size:.8rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}.des-pc b{color:#f0d78c}'
    + '.des-av{font-size:.78rem;color:#fbbf24;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:10px;padding:7px 9px;margin-top:7px}'
    + '.des-li{display:flex;align-items:center;gap:10px;border-radius:13px;padding:12px;margin-bottom:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);cursor:pointer}'
    + '.des-dica{font-size:.74rem;color:#9a917e;margin-top:6px;line-height:1.4}'
    + '.des-bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:8px;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:rgba(10,9,8,.96);border-top:1px solid rgba(201,168,76,.18);z-index:2}.des-bar .des-bt{margin:0;padding:12px 6px;font-size:.84rem}'
    + '#hrDesZoom{position:fixed;inset:0;z-index:9995;background:#2a2a2a;overflow:hidden;touch-action:none}#hrDesZoom .in{transform-origin:0 0;position:absolute;left:0;top:0}#hrDesZoom .fx{position:absolute;right:12px;top:max(12px,env(safe-area-inset-top));z-index:2;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:12px;padding:10px 14px;font-size:1rem}'
    + '.des-card-sec{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:16px;padding:14px;margin:10px 0;background:linear-gradient(135deg,rgba(96,165,250,.14),rgba(201,168,76,.05));border:1px solid rgba(96,165,250,.35);color:#efe9dc;cursor:pointer}.des-card-sec .ic{font-size:1.5rem}.des-card-sec .t{font-weight:800}.des-card-sec .s{font-size:.72rem;color:#9a917e}';
  function css() { if (document.getElementById('hrDesCss2')) return; var o = document.getElementById('hrDesCss'); if (o) o.remove(); var s = document.createElement('style'); s.id = 'hrDesCss2'; s.textContent = CSS; document.head.appendChild(s); }
  function campo(k, rot, v, n, ph) { return '<div><span class="des-l">' + rot + '</span><input class="des-i" data-f="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (n ? ' inputmode="decimal"' : '') + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>'; }
  function chips(k, v, ops) { return '<div class="des-ch">' + ops.map(function (o) { return '<button type="button" data-ch="' + k + '" data-v="' + esc(o[0]) + '" class="' + (String(v) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function lig(k, v, rot) { return '<button type="button" data-tg="' + k + '" class="' + (v ? 'on' : '') + '">' + (v ? '✓ ' : '') + rot + '</button>'; }
  function painelPeca(pc, i) {
    var ab = st.aberta === i, t = TIPOS[pc.tipo] || {}, h = '<div class="des-sec" data-pc="' + i + '"><div class="des-pc-h" data-abrepc="' + i + '"><span style="font-size:1.1rem">' + (t.ic || '▬') + '</span><b>' + (i + 1) + '. ' + esc(nomePeca(pc)) + (num(pc.qtd) > 1 ? ' ×' + num(pc.qtd) : '') + '</b><span class="des-sub">' + (oblq(pc) ? f1(num(pc.A)) + (pc.tipo === 'L' ? ' + ' + f1(num(pc.B)) : '') + ' × ' + f1(num(pc.p)) : f1(num(pc.A)) + ' × ' + f1(num(pc.H))) + '</span><span style="color:#c9a84c">' + (ab ? '▾' : '▸') + '</span></div>';
    if (!ab) return h + '</div>';
    h += '<div class="des-g2">' + campo('nome', 'Nome na folha', pc.nome, false, nomePeca(pc)) + campo('qtd', 'Quantidade', pc.qtd, true) + '</div>';
    if (oblq(pc)) {
      if (pc.tipo === 'L') {
        h += '<span class="des-l" style="margin-top:8px">Perna do L</span>' + chips('perna', pc.perna, [['esq', '⌙ Esquerda'], ['dir', '⌐ Direita']]);
        h += '<div class="des-g">' + campo('A', 'Comprimento (fundo)', pc.A, true) + campo('B', 'Perna (total)', pc.B, true) + campo('p', 'Largura', pc.p, true) + '</div>';
        h += '<div class="des-g2">' + campo('pB', 'Largura da perna', pc.pB, true) + '<div><span class="des-l">Quem fica com o canto</span>' + chips('emenda', pc.emenda, [['principal', 'Fundo'], ['perna', 'Perna']]) + '</div></div>';
      } else h += '<div class="des-g2">' + campo('A', 'Comprimento', pc.A, true) + campo('p', 'Largura', pc.p, true) + '</div>';
      h += '<span class="des-l" style="margin-top:9px">Sainha</span>' + chips('saia', pc.saia, SAIAS) + (pc.saia !== 'nenhuma' ? '<div class="des-g2">' + campo('saiaAlt', 'Altura da sainha (cm)', pc.saiaAlt, true) + '<div></div></div>' : '');
      if (pc.tipo !== 'prateleira') {
        h += '<span class="des-l" style="margin-top:9px">Frontões</span><div class="des-ch">' + lig('frF', pc.frF, 'Fundo') + lig('frE', pc.frE, 'Lado esquerdo') + lig('frD', pc.frD, 'Lado direito') + '</div>';
        if (pc.frF || pc.frE || pc.frD) h += '<div class="des-g2">' + campo('fr', 'Altura do frontão (cm)', pc.fr, true) + '<div></div></div>';
        var c = pc.cuba || {};
        h += '<span class="des-l" style="margin-top:9px">Cuba</span>' + chips('cuba.tipo', c.tipo, CUBAS);
        if (c.tipo !== 'nenhuma') {
          if (!/esculp|rampada/.test(c.tipo)) h += chips('cuba.inst', c.inst, [['embutida', 'Embutida'], ['sobrepor', 'De sobrepor'], ['flush', 'Flush']]);
          h += '<div class="des-g">' + campo('cuba.w', c.tipo === 'redonda' ? 'Diâmetro' : 'Comprimento', c.w, true) + (c.tipo === 'redonda' ? '<div></div>' : campo('cuba.h', 'Largura', c.h, true)) + campo('cuba.x', 'Centro a (cm)', c.x, true, pc.reb && pc.reb.on ? 'no rebaixo' : 'no meio') + '</div>';
          h += '<div class="des-g2"><div><span class="des-l">Medido do canto</span>' + chips('cuba.ref', c.ref, [['esq', 'Esquerdo'], ['dir', 'Direito']]) + '</div>' + campo('cuba.fy', 'Centro a da frente (cm)', c.fy, true, 'no meio') + '</div>';
        }
        var rb = pc.reb || {};
        h += '<div class="des-ch" style="margin-top:9px">' + lig('reb.on', rb.on, 'Rebaixo americano') + lig('cook.on', pc.cook && pc.cook.on, 'Cooktop') + '</div>';
        if (rb.on) h += '<div class="des-g">' + campo('reb.c', 'Rebaixo: comp.', rb.c, true) + campo('reb.l', 'Largura', rb.l, true) + campo('reb.x', 'Início a (do canto esq.)', rb.x, true, 'pela cuba') + '</div>';
        if (pc.cook && pc.cook.on) h += '<div class="des-g">' + campo('cook.w', 'Cooktop: comp.', pc.cook.w, true) + campo('cook.h', 'Largura', pc.cook.h, true) + campo('cook.x', 'Centro a (do canto esq.)', pc.cook.x, true, 'à esquerda') + '</div>';
        h += '<span class="des-l" style="margin-top:9px">Pé estrutural</span>' + chips('pe', pc.pe, [['nenhum', 'Sem pé'], ['esq', 'No lado esquerdo'], ['dir', 'No lado direito']]);
        if (pc.pe !== 'nenhum') h += '<div class="des-g2">' + campo('peAlt', 'Altura do pé (cm)', pc.peAlt, true) + '<div></div></div>';
      }
      h += '<span class="des-l" style="margin-top:9px">Vista</span>' + chips('vista', +pc.vista || 0, [[0, 'Automática'], [1, 'Fundo p/ direita'], [-1, 'Fundo p/ esquerda']]);
    } else if (pc.tipo === 'nicho') h += '<div class="des-g">' + campo('A', 'Largura', pc.A, true) + campo('H', 'Altura', pc.H, true) + campo('prof', 'Profundidade', pc.prof, true) + '</div>';
    else h += '<div class="des-g2">' + campo('A', 'Largura', pc.A, true) + campo('H', 'Altura', pc.H, true) + '</div>';
    h += '<div style="margin-top:8px"><span class="des-l">Observação desta peça (vai embaixo da folha)</span><input class="des-i" data-f="obs" value="' + esc(pc.obs || '') + '" placeholder="ex.: válvula oculta, nicho para papel"></div>';
    h += avisos(pc).map(function (a) { return '<div class="des-av">⚠️ ' + esc(a) + '</div>'; }).join('');
    h += '<div style="display:flex;gap:6px;margin-top:9px"><button class="des-x" data-dup="' + i + '" style="border-color:rgba(201,168,76,.35);color:#e8c96a">Duplicar</button><button class="des-x" data-rmpc="' + i + '">Remover peça</button></div>';
    return h + '</div>';
  }
  function painel() {
    var d = st.d, h = '<div class="des-sec"><h4>Projeto</h4>' + campo('cliente', 'Cliente', d.cliente) + '<div style="height:7px"></div>' + campo('material', 'Material', d.material, false, 'ex.: preto São Gabriel')
      + '<div style="margin-top:7px"><span class="des-l">Descrição (vazio = escrevo sozinho)</span><textarea class="des-ta" data-f="desc" placeholder="' + esc(descAuto(d)) + '">' + esc(d.desc || '') + '</textarea></div></div>';
    h += (d.pecas || []).map(painelPeca).join('');
    h += '<div class="des-sec"><h4>Adicionar peça</h4><div class="des-add">' + Object.keys(TIPOS).map(function (k) { return '<button data-addpc="' + k + '">' + TIPOS[k].ic + ' ' + TIPOS[k].n + '</button>'; }).join('') + '</div></div>';
    h += '<div class="des-sec"><h4>Observações gerais</h4><textarea class="des-ta" data-f="obs" placeholder="Uma por linha. Ex.: Área molhada 130x48">' + esc(d.obs || '') + '</textarea></div>';
    var pcs = []; (d.pecas || []).forEach(function (pc) { corte(pc).forEach(function (x) { x.de = nomePeca(pc); pcs.push(x); }); });
    h += '<div class="des-sec"><h4>Lista de peças para o corte</h4>' + (pcs.length ? pcs.map(function (p) { return '<div class="des-pc"><span>' + (p.qtd > 1 ? p.qtd + '× ' : '') + esc(p.nome) + ((d.pecas || []).length > 1 && p.nome.indexOf(p.de) < 0 ? ' <span class="des-sub">(' + esc(p.de) + ')</span>' : '') + '</span><b>' + f1(p.c) + ' × ' + f1(p.l) + '</b></div>'; }).join('') : '<div class="des-dica">Sem peças.</div>') + '</div>';
    h += '<button class="des-bt des-bt2" data-acao="apagar" style="background:transparent;border:1px solid rgba(239,68,68,.35);color:#f87171">Apagar este desenho</button>';
    return h;
  }
  function telaEditor() {
    var m = document.getElementById('desMain'); if (!m) return;
    m.innerHTML = '<div class="des-cv" id="desCv" data-acao="zoom"></div><div class="des-pn" id="desPn">' + painel() + '</div>';
    var bar = document.getElementById('desBar'); if (bar) bar.style.display = 'flex';
    desenharCv();
  }
  function desenharCv() { var cv = document.getElementById('desCv'); if (!cv) return; cv.innerHTML = folhaSvg(st.d) + '<span class="lupa">🔍 Toque para ampliar</span>'; }
  function atualizarPainel() {
    var pn = document.getElementById('desPn'); if (!pn) return; var y = document.getElementById('desMain').scrollTop, ae = document.activeElement, foco = ae && ae.getAttribute('data-f'), pci = ae && ae.closest('[data-pc]');
    pn.innerHTML = painel(); document.getElementById('desMain').scrollTop = y;
    if (foco) { var sel = pci ? pn.querySelector('[data-pc="' + pci.getAttribute('data-pc') + '"] [data-f="' + foco + '"]') : pn.querySelector(':scope > .des-sec [data-f="' + foco + '"]'); if (sel) { sel.focus(); try { var v = sel.value; sel.setSelectionRange(v.length, v.length); } catch (e) {} } }
  }
  function telaLista() {
    var m = document.getElementById('desMain'); if (!m) return; var l = lista(), bar = document.getElementById('desBar'); if (bar) bar.style.display = 'none';
    m.innerHTML = '<div style="flex:1 1 100%;max-width:720px;margin:0 auto"><button class="des-bt" data-acao="novo">＋ Novo projeto</button><div style="height:10px"></div>' + (l.length ? l.map(function (d) { return '<div class="des-li" data-abre="' + esc(d.id) + '"><span style="font-size:1.4rem">📐</span><div style="flex:1"><b>' + esc(d.cliente || 'Sem cliente') + '</b><div class="des-sub">' + esc(vazio(d.desc) ? descAuto(d) : d.desc) + (d.material ? ' · ' + esc(d.material) : '') + ' · ' + new Date(d.em).toLocaleDateString('pt-BR') + '</div></div><span style="color:#c9a84c">›</span></div>'; }).join('') : '<div class="des-dica" style="text-align:center;padding:30px">Nenhum projeto ainda. Toque em <b>Novo projeto</b>.</div>') + '</div>';
  }
  function render() { var sub = document.getElementById('desSub'); if (st.tela === 'lista') { if (sub) sub.textContent = 'Projeto 2D sob medida, no padrão da HR'; telaLista(); } else { if (sub) sub.textContent = st.d.cliente || 'Novo projeto'; telaEditor(); } }
  function pcDe(el) { var p = el.closest('[data-pc]'); return p ? st.d.pecas[+p.getAttribute('data-pc')] : null; }
  function setK(o, k, v) { var ps = k.split('.'); if (ps.length === 2) { o[ps[0]] = o[ps[0]] || {}; o[ps[0]][ps[1]] = v; } else o[k] = v; }
  function getK(o, k) { var ps = k.split('.'); return ps.length === 2 ? (o[ps[0]] || {})[ps[1]] : o[k]; }
  function lerCampo(el) { var k = el.getAttribute('data-f'), pc = pcDe(el); setK(pc || st.d, k, el.value); if (!pc && k === 'cliente') { var sub = document.getElementById('desSub'); if (sub) sub.textContent = el.value || 'Novo projeto'; } }
  function zoom() {
    var z = document.createElement('div'); z.id = 'hrDesZoom'; z.innerHTML = '<button class="fx">✕ Fechar</button><div class="in">' + folhaSvg(st.d) + '</div>'; document.body.appendChild(z);
    var inn = z.querySelector('.in'), sv = inn.querySelector('svg'), W = innerWidth, H = innerHeight, k0 = Math.min(W / FW, H / FH), t = { k: k0, x: (W - FW * k0) / 2, y: (H - FH * k0) / 2 }, pts = {}, ini = null, ult = 0;
    sv.setAttribute('width', FW); sv.setAttribute('height', FH);
    var ap = function () { inn.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + t.k + ')'; }; ap();
    var est = function () { var l = Object.keys(pts).map(function (k) { return pts[k]; }); if (!l.length) return null; var cx = l.reduce(function (s, p) { return s + p.x; }, 0) / l.length, cy = l.reduce(function (s, p) { return s + p.y; }, 0) / l.length, dd = l.length > 1 ? Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y) : 0; return { cx: cx, cy: cy, d: dd, n: l.length, t: { k: t.k, x: t.x, y: t.y } }; };
    z.addEventListener('pointerdown', function (e) { if (e.target.closest('.fx')) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY }; ini = est(); try { z.setPointerCapture(e.pointerId); } catch (er) {} var ag = Date.now(); if (ag - ult < 300 && ini.n === 1) { var nk = t.k > k0 * 1.5 ? k0 : k0 * 3; t.x = e.clientX - (e.clientX - t.x) * nk / t.k; t.y = e.clientY - (e.clientY - t.y) * nk / t.k; t.k = nk; if (nk === k0) { t.x = (W - FW * k0) / 2; t.y = (H - FH * k0) / 2; } ap(); } ult = ag; });
    z.addEventListener('pointermove', function (e) { if (!pts[e.pointerId] || !ini) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY }; var a = est(); if (!a || a.n !== ini.n) { ini = a; return; } var k = ini.n > 1 && ini.d > 0 ? Math.max(k0 * 0.8, Math.min(k0 * 8, ini.t.k * a.d / ini.d)) : ini.t.k; t.k = k; t.x = a.cx - (ini.cx - ini.t.x) * k / ini.t.k; t.y = a.cy - (ini.cy - ini.t.y) * k / ini.t.k; ap(); });
    var fim = function (e) { delete pts[e.pointerId]; ini = est(); }; z.addEventListener('pointerup', fim); z.addEventListener('pointercancel', fim);
    z.addEventListener('wheel', function (e) { e.preventDefault(); var nk = Math.max(k0 * 0.8, Math.min(k0 * 8, t.k * (e.deltaY < 0 ? 1.15 : 0.87))); t.x = e.clientX - (e.clientX - t.x) * nk / t.k; t.y = e.clientY - (e.clientY - t.y) * nk / t.k; t.k = nk; ap(); }, { passive: false });
    z.querySelector('.fx').onclick = function () { z.remove(); };
  }
  function enviarProducao() {
    var d = st.d; aviso('Carregando os pedidos…');
    api('/bot/producao').then(function (pr) {
      var ops = pr.pedidos.map(function (p, i) { return (i + 1) + '. ' + p.nome; }).join('\n');
      var esc1 = prompt('Para qual pedido é este projeto? Digite o número (vazio = só mandar a imagem):\n' + ops, ''), ped = esc1 ? pr.pedidos[(+esc1) - 1] : null;
      if (esc1 && !ped) { aviso('Número inválido'); return; }
      var usar = ped ? confirm('Usar as peças deste desenho no pedido de ' + ped.nome + '? (cada peça vira um item, com as etapas e os pontos por estas medidas)') : false;
      var para = confirm('Mandar a imagem no WhatsApp de quem faz o corte, o polimento e a fabricação?') ? ['fabResp', 'poliResp', 'fab2Resp'] : [];
      if (!ped && !para.length) { aviso('Nada a fazer.'); return; }
      if (!ped) { var ids = prompt('Sem pedido: para quem mandar? Escreva os nomes separados por vírgula (ex.: Fabrício, Hugo)', ''); if (!ids) return; para = (pr.equipe || []).filter(function (f) { return ids.toLowerCase().split(',').some(function (n) { return n.trim() && f.nome.toLowerCase().indexOf(n.trim()) === 0; }); }).map(function (f) { return f.id; }); }
      return pngDe(d).then(b64).then(function (png) {
        var itens = (d.pecas || []).map(itemProducao).filter(function (it) { return it.pecas.length; });
        return api('/bot/desenho', { pid: ped ? ped.id : '', nome: d.cliente || (ped && ped.nome) || 'Projeto', png: png, usarPecas: usar, itens: itens, para: para, legenda: (vazio(d.desc) ? descAuto(d) : d.desc) + (d.material ? ' · ' + d.material : '') + ' · medidas em cm.' });
      }).then(function (r) { d.pid = ped ? ped.id : d.pid; guardar(d); aviso('✅ ' + (r.trocou ? 'Peças do pedido atualizadas. ' : '') + (r.enviados.length ? 'Enviado a ' + r.enviados.join(', ') + '. ' : '') + (r.fora.length ? 'Fora das 24 h: ' + r.fora.join(', ') + ' (avisados para pedir).' : '') + (r.erro ? ' ' + r.erro : '')); });
    }).catch(function (e) { aviso('⚠️ ' + e.message); });
  }
  function abrir() {
    css(); var v = document.getElementById('hrDes'); if (v) v.remove(); st.tela = 'lista';
    var el = document.createElement('div'); el.id = 'hrDes';
    el.innerHTML = '<div class="des-top"><button class="des-ic" data-acao="voltar">←</button><div style="flex:1;"><b>📐 Projeto 2D</b><div class="des-sub" id="desSub"></div></div></div><div class="des-main" id="desMain"></div>'
      + '<div class="des-bar" id="desBar" style="display:none"><button class="des-bt des-bt2" data-acao="salvar">💾 Salvar</button><button class="des-bt des-bt2" data-acao="png">📤 Imagem</button><button class="des-bt" data-acao="prod">🏭 Produção</button></div>';
    document.body.appendChild(el);
    el.addEventListener('input', function (e) { var t = e.target.closest('[data-f]'); if (!t || st.tela !== 'editor') return; lerCampo(t); desenharCv(); clearTimeout(st.tm); st.tm = setTimeout(function () { var pc = pcDe(t); if (pc) { var hd = document.querySelector('[data-pc="' + st.d.pecas.indexOf(pc) + '"] .des-pc-h'); if (hd) { var tmp = document.createElement('div'); tmp.innerHTML = painelPeca(pc, st.d.pecas.indexOf(pc)); var nh = tmp.querySelector('.des-pc-h'); hd.innerHTML = nh.innerHTML; var sec = hd.parentNode; sec.querySelectorAll('.des-av').forEach(function (a) { a.remove(); }); var rb2 = sec.querySelector('[data-dup]'); if (!rb2) return; var ref = rb2.parentNode; tmp.querySelectorAll('.des-av').forEach(function (a) { sec.insertBefore(a, ref); }); } } }, 500); });
    el.addEventListener('click', function (e) {
      var d = st.d, a = e.target.closest('[data-acao]'), ch = e.target.closest('[data-ch]'), tg = e.target.closest('[data-tg]'), ad = e.target.closest('[data-addpc]'), rm = e.target.closest('[data-rmpc]'), dp = e.target.closest('[data-dup]'), ap = e.target.closest('[data-abrepc]'), ab = e.target.closest('[data-abre]');
      if (ch) { var pc = pcDe(ch), k = ch.getAttribute('data-ch'), vv = ch.getAttribute('data-v'); if (k === 'vista') vv = +vv; setK(pc, k, vv); if (k === 'cuba.tipo') { var cb = pc.cuba; if (vv === 'redonda') { cb.w = pc.tipo === 'lavatorio' ? 40 : 45; cb.h = cb.w; } else if (vv === 'oval') { cb.w = 48; cb.h = 36; } else if (/esculp|rampada/.test(vv)) { cb.w = 50; cb.h = 35; } else if (vv === 'retangular') { cb.w = pc.tipo === 'lavatorio' ? 45 : 56; cb.h = pc.tipo === 'lavatorio' ? 30 : 34; } } desenharCv(); atualizarPainel(); return; }
      if (tg) { var pc2 = pcDe(tg), k2 = tg.getAttribute('data-tg'); setK(pc2, k2, !getK(pc2, k2)); desenharCv(); atualizarPainel(); return; }
      if (ad) { d.pecas.push(novaPeca(ad.getAttribute('data-addpc'))); st.aberta = d.pecas.length - 1; desenharCv(); atualizarPainel(); var u = document.querySelector('[data-pc="' + st.aberta + '"]'); if (u) u.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (rm) { if (!confirm('Remover esta peça?')) return; d.pecas.splice(+rm.getAttribute('data-rmpc'), 1); st.aberta = -1; desenharCv(); atualizarPainel(); return; }
      if (dp) { var cp = JSON.parse(JSON.stringify(d.pecas[+dp.getAttribute('data-dup')])); cp.id = uid(); d.pecas.splice(+dp.getAttribute('data-dup') + 1, 0, cp); st.aberta = +dp.getAttribute('data-dup') + 1; desenharCv(); atualizarPainel(); return; }
      if (ap) { var i = +ap.getAttribute('data-abrepc'); st.aberta = st.aberta === i ? -1 : i; atualizarPainel(); return; }
      if (ab) { var x = lista().filter(function (y) { return y.id === ab.getAttribute('data-abre'); })[0]; if (x) { st.d = x; st.aberta = 0; st.tela = 'editor'; render(); } return; }
      if (!a) return; var k3 = a.getAttribute('data-acao');
      if (k3 === 'zoom') { zoom(); return; }
      if (k3 === 'voltar') { if (st.tela === 'editor') { guardar(st.d); st.tela = 'lista'; render(); } else el.remove(); return; }
      if (k3 === 'novo') { st.d = novo(); st.aberta = 0; st.tela = 'editor'; render(); return; }
      if (k3 === 'apagar') { if (confirm('Apagar este desenho?')) { apagar(d.id); st.tela = 'lista'; render(); } return; }
      if (k3 === 'salvar') { guardar(d); aviso('💾 Projeto salvo'); return; }
      if (k3 === 'png') { guardar(d); pngDe(d).then(function (b) { var nome = 'Projeto ' + (d.cliente || 'HR') + '.png', f = new File([b], nome, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: nome }).catch(function () {}); var u2 = URL.createObjectURL(b), l = document.createElement('a'); l.href = u2; l.download = nome; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u2); }, 4000); }).catch(function (er) { aviso('⚠️ ' + er.message); }); return; }
      if (k3 === 'prod') { guardar(d); enviarProducao(); return; }
    });
    render();
  }
  function cartaoSec() {
    var sb = document.getElementById('secBody'); if (!sb || sb.querySelector('[data-des-btn]')) return;
    css();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'des-card-sec'; b.setAttribute('data-des-btn', '1');
    b.innerHTML = '<span class="ic">📐</span><div style="flex:1;"><div class="t">Projeto 2D sob medida</div><div class="s">Desenho no padrão da HR: pia, cozinha em L, lavatório, prateleira, nicho, com medidas e observações</div></div><span style="color:#60a5fa;font-size:1.3rem;">›</span>';
    b.onclick = abrir;
    var ref = sb.querySelector('[data-prd-btn]') || sb.querySelector('[data-dsm-btn]');
    if (ref && ref.nextSibling) sb.insertBefore(b, ref.nextSibling); else sb.appendChild(b);
  }
  function iniciar() { var sb = document.getElementById('secBody'); if (!sb) return setTimeout(iniciar, 1500); cartaoSec(); new MutationObserver(cartaoSec).observe(sb, { childList: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.abrirDesenho = abrir; window.__hrDesTeste = { folhaSvg: folhaSvg, novo: novo, novaPeca: novaPeca, corte: corte, itemProducao: itemProducao, notas: notas, descAuto: descAuto, avisos: avisos, migrar: migrar, st: st };
})();
