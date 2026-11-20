// app-desenho.js — v5: módulos prontos (como no Promob), arrastar cuba/rebaixo/cooktop no desenho e tocar nos números para mudar medidas.
// v3: escreve o projeto como fala (ou dita) e o desenho sai sozinho; botões só em 'Ajustar detalhes'.
// v2: 📐 Projeto 2D sob medida (no padrão dos desenhos da HR)
// Folha retrato com o cabeçalho verde da HR (Cliente, Descrição, Material), peças em perspectiva com traço cinza,
// medidas grandes em verde junto das bordas e as observações embaixo (centro da cuba, rebaixo, saias, frontões).
// Várias peças na mesma folha: pia reta, cozinha em L, lavatório, prateleira, nicho e placas (divisória etc.).
// Sai a lista de peças sozinha e manda para a produção pelo bot (cada peça vira um item com as suas etapas).
(function () {
  'use strict';
  if (window.__hrDes) return; window.__hrDes = true;
  var KEY = 'hr_desenhos', st = { tela: 'lista', d: null, aberta: 0, sel: 0, lay: {} };
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
      cuba: { tipo: 'nenhuma', inst: 'embutida', ref: 'esq', x: '', w: 56, h: 34, fy: '' }, reb: { on: false, tipo: 'americano', c: 120, l: 48, x: '' }, cook: { on: false, x: '', w: 56, h: 49 }, pe: 'nenhum', peAlt: 90, H: 40, prof: 10, obs: '' };
    if (t === 'bancada') { p.cuba.tipo = 'retangular'; }
    if (t === 'L') { p.A = 250; p.B = 100; p.Bv = 2; p.cuba.tipo = 'retangular'; p.frD = true; }
    if (t === 'lavatorio') { p.A = 80; p.p = 45; p.saiaAlt = 10; p.cuba = { tipo: 'redonda', inst: 'embutida', ref: 'esq', x: '', w: 40, h: 40, fy: '' }; }
    if (t === 'prateleira') { p.A = 80; p.p = 35; p.frF = false; }
    if (t === 'nicho') { p.A = 60; p.H = 30; p.prof = 10; p.saia = 'nenhuma'; p.frF = false; }
    if (t === 'placa') { p.A = 40; p.H = 80; p.nome = 'Divisória'; p.saia = 'nenhuma'; p.frF = false; }
    return p;
  }
  function novo() { return { v: 2, id: 'd' + Date.now(), cliente: '', desc: '', material: '', obs: '', pid: '', texto: '', pecas: [] }; }
  function migrar(d) { // desenhos da v1 (forma/A/B/recortes)
    if (!d || d.v === 2) return d;
    var p = novaPeca(d.forma === 'reta' ? 'bancada' : 'L'); p.A = num(d.A, 200); p.p = num(d.p, 60); p.B = num(d.B, 95); p.Bv = 0; p.fr = num(d.frAlt, 10); p.saia = d.saiaTipo || 'reta'; p.saiaAlt = num(d.saiaAlt, 4);
    var cb = (d.recortes || []).filter(function (r) { return r.tipo === 'cuba'; })[0], rb = (d.recortes || []).filter(function (r) { return r.tipo === 'rebaixo'; })[0], ck = (d.recortes || []).filter(function (r) { return r.tipo === 'cooktop'; })[0];
    p.cuba.tipo = cb ? 'retangular' : 'nenhuma'; if (cb) { p.cuba.inst = cb.inst || 'embutida'; p.cuba.w = num(cb.w, 50); p.cuba.h = num(cb.h, 40); p.cuba.x = num(cb.x) + num(cb.w) / 2; }
    if (rb) { p.reb = { on: true, c: num(rb.w, 121), l: num(rb.h, 48), x: num(rb.x) }; }
    if (ck) { p.cook = { on: true, x: num(ck.x) + num(ck.w) / 2, w: num(ck.w, 56), h: num(ck.h, 49) }; }
    return { v: 2, id: d.id, cliente: d.cliente || '', desc: d.desc || '', material: d.material || '', obs: d.obs || '', pid: d.pid || '', em: d.em, pecas: [p] };
  }
  function migrarB(d) { (d && d.pecas || []).forEach(function (pc) { if (pc && pc.tipo === 'L' && !pc.Bv) { pc.B = Math.max(5, num(pc.B, 160) - num(pc.p, 60)); pc.Bv = 2; } }); return d; }
  function lista() { try { return (JSON.parse(localStorage.getItem(KEY) || '[]') || []).map(migrar).map(migrarB); } catch (e) { return []; } }
  function guardar(d) { var l = lista().filter(function (x) { return x.id !== d.id; }); d.em = Date.now(); l.unshift(JSON.parse(JSON.stringify(d))); try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 80))); } catch (e) {} }
  function apagar(id) { try { localStorage.setItem(KEY, JSON.stringify(lista().filter(function (x) { return x.id !== id; }))); } catch (e) {} }

  function oblq(pc) { return ['bancada', 'L', 'lavatorio', 'prateleira'].indexOf(pc.tipo) >= 0; }
  function temSaia(pc) { return pc.saia !== 'nenhuma' && pc.saia !== 'slim' && num(pc.saiaAlt) > 0; } // slim = só a espessura da pedra, sem sainha
  function nomePeca(pc) {
    if (!vazio(pc.nome)) return String(pc.nome).trim();
    return { bancada: 'Pia', L: 'Cozinha em L', lavatorio: 'Lavatório', prateleira: 'Prateleira', nicho: 'Nicho', placa: 'Placa' }[pc.tipo] || 'Peça';
  }

  // ── geometria (x: comprimento, da esquerda; y: profundidade, 0 = frente; z: altura) ──
  function geo(pc) {
    var A = Math.max(5, num(pc.A, 100)), p = Math.max(5, num(pc.p, 60)), T = temSaia(pc) ? num(pc.saiaAlt) : 2, bx = [], Ymax = p, yAt = { e: 0, d: 0 };
    if (pc.tipo === 'L') {
      var B = Math.max(5, num(pc.B, 100)) + p, pB = Math.min(A - 5, Math.max(5, num(pc.pB, p))), dir = pc.perna !== 'esq', prn = pc.emenda === 'perna';
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
    var main = bx[0], rebZ = T;
    if (rebNormal(pc)) {
      var rr = recortes(pc, { A: A, p: p, main: main }).filter(function (r) { return r.t === 'reb'; })[0];
      if (rr) {
        var pts = [], cp = function (k, x0, x1, z0, z1, y0) { if (x1 - x0 > 0.5) pts.push({ k: k, g: 'slab', x0: x0, x1: x1, y0: y0 == null ? main.y0 : y0, y1: y0 == null ? main.y1 : y0 === main.y0 ? main.y0 + 3 : main.y1, z0: z0, z1: z1 }); };
        rebZ = T - REB_DESCE;
        cp('tE', main.x0, rr.x0, 0, T); cp('rebN', rr.x0, rr.x1, 0, Math.max(1, T - REB_DESCE)); cp('rebF', rr.x0, rr.x1, 0, T, main.y0); rebZ = Math.max(1, T - REB_DESCE); cp('tD', rr.x1, main.x1, 0, T);
        // a sainha da área molhada fica na altura toda (borda na frente); o tampo da área molhada desce 2 cm atrás dela; no corte dos lados só aparece o degrau
        pts.forEach(function (b) { if (b.k === 'rebF') b.semLado = true; if (b.k === 'tE' || b.k === 'tD') { b.zs = rebZ; b.ys = main.y0 + 3; } }); // o degrau começa atrás da borda da frente
        bx.splice.apply(bx, [0, 1].concat(pts));
        var fF = bx.filter(function (b) { return b.k === 'frF'; })[0];
        if (fF) { // frontão dividido na área molhada, com 2 cm a mais lá
          var fp = [], cf = function (k, x0, x1, z0) { if (x1 - x0 > 0.5) fp.push({ k: k, g: 'fr', x0: x0, x1: x1, y0: fF.y0, y1: fF.y1, z0: z0, z1: fF.z1 }); };
          cf('frF', fF.x0, rr.x0, fF.z0); cf('frM', rr.x0, rr.x1, fF.z0 - REB_DESCE); cf('frF', rr.x1, fF.x1, fF.z0);
          bx.splice.apply(bx, [bx.indexOf(fF), 1].concat(fp));
        }
      }
    }
    return { A: A, p: p, T: T, Ymax: Ymax, boxes: bx, main: main, yAt: yAt, rebZ: rebZ };
  }
  // posições dos recortes no tampo principal
  function recortes(pc, g) {
    var m = g.main, L = [], A = g.A, p = g.p, c = pc.cuba || {}, rb = pc.reb || {}, ck = pc.cook || {};
    var xRef = function (v, ref) { return ref === 'dir' ? A - v : v; };
    var meioX = (m.x0 + m.x1) / 2, rebR = null;
    if (rb.on && oblq(pc) && pc.tipo !== 'prateleira') {
      var nrm = rebNormal(pc), rc = Math.min(m.x1 - m.x0 - (nrm ? 10 : 6), Math.max(10, num(rb.c, 120))), rl = Math.min(p - 4, Math.max(10, num(rb.l, 48))), rx0, mg = nrm ? 0 : 3;
      if (!vazio(rb.x)) rx0 = num(rb.x);
      else rx0 = c.tipo !== 'nenhuma' && !vazio(c.x) ? xRef(num(c.x), c.ref) - rc / 2 : meioX - rc / 2;
      rx0 = Math.max(m.x0 + mg, Math.min(rx0, m.x1 - mg - rc));
      if (nrm) { if (rx0 - m.x0 < 3) rx0 = m.x0; if (m.x1 - rx0 - rc < 3) rx0 = m.x1 - rc; }
      rebR = nrm ? { t: 'reb', n: true, x0: rx0, x1: rx0 + rc, y0: m.y0, y1: m.y1 } : { t: 'reb', x0: rx0, x1: rx0 + rc, y0: m.y1 - 2 - rl, y1: m.y1 - 2 };
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
  // rebaixo normal: quase igual ao americano, mas cortado até a sainha: tampo, pedra do rebaixo 2 cm mais baixa, tampo (2 pedras se encostar numa lateral);
  // o frontão é dividido na área molhada e lá tem 2 cm a mais
  function rebNormal(pc) { return !!(pc.reb && pc.reb.on && pc.reb.tipo === 'normal' && oblq(pc) && pc.tipo !== 'prateleira'); }
  var REB_DESCE = 2;
  function avisos(pc) {
    if (!oblq(pc)) return [];
    var g = geo(pc), R = recortes(pc, g), m = g.main, out = [], nm = { reb: 'O rebaixo', cuba: 'A cuba', cook: 'O cooktop' };
    R.forEach(function (r) {
      if (r.n) return;
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
    if (oblq(pc)) { var b = bboxOb(pc); return { w: b.x1 - b.x0, h: b.y1 - b.y0, mL: 110, mR: 110, mT: pc.reb && pc.reb.on && pc.tipo !== 'prateleira' ? 135 : 78, mB: pc.tipo === 'L' || num(pc.qtd) > 1 ? 70 : 24 }; }
    var A = Math.max(5, num(pc.A)), H = Math.max(5, num(pc.H));
    return pc.tipo === 'nicho' ? { w: A + 16, h: H + 16, mL: 20, mR: 50, mT: 20, mB: 20 } : { w: A, h: H, mL: 20, mR: 70, mT: 20, mB: 50 };
  }

  // ── desenho de uma peça em perspectiva ──
  var COR = { tr: '#4a4a52', vd: '#4d6b54', am: '#d9b23a', az: '#5bc0d6' };
  function poly(pts, extra) { return '<polygon points="' + pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" ' + (extra || 'fill="#fff"') + '/>'; }
  function txt(x, y, t, fs, anc, cor, extra) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs + '" text-anchor="' + (anc || 'middle') + '" fill="' + (cor || COR.vd) + '"' + (extra || '') + '>' + esc(t) + '</text>'; }
  function dimTxt(x, y, t, fs, anc, key) { // número da medida; na tela vira um "botão" para tocar e mudar
    if (MINI) return ''; var h = txt(x, y, t, fs, anc); if (!INTER || !key) return h;
    var w = String(t).length * fs * 0.58 + 22, a = anc || 'middle', x0 = a === 'middle' ? x - w / 2 : a === 'end' ? x - w + 11 : x - 11;
    return '<g data-dim="' + key + '" style="cursor:pointer"><rect x="' + x0.toFixed(1) + '" y="' + (y - fs * 0.86).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (fs * 1.12).toFixed(1) + '" rx="10" fill="#e8c96a" fill-opacity=".2" stroke="#c9a84c" stroke-opacity=".7" stroke-dasharray="6 4" stroke-width="1.6"/>' + h + '</g>';
  }
  function cota(a, b, n, d, t, fs, key, semIniExt, semFimExt) { // a,b: pontos na tela; n: direção para fora; d: afastamento
    if (MINI) return '';
    var o1 = [a[0] + n[0] * d, a[1] + n[1] * d], o2 = [b[0] + n[0] * d, b[1] + n[1] * d], ln = 'stroke="' + COR.tr + '" stroke-width="1.3" fill="none"', h = '';
    var ext = function (p, o) { return '<line x1="' + (p[0] + n[0] * 2).toFixed(1) + '" y1="' + (p[1] + n[1] * 2).toFixed(1) + '" x2="' + (o[0] + n[0] * 8).toFixed(1) + '" y2="' + (o[1] + n[1] * 8).toFixed(1) + '" ' + ln + '/>'; };
    if (!semIniExt) h += ext(a, o1); if (!semFimExt) h += ext(b, o2);
    var vx = o2[0] - o1[0], vy = o2[1] - o1[1], L0 = Math.hypot(vx, vy) || 1, u = [vx / L0, vy / L0];
    h += '<line x1="' + (o1[0] - u[0] * 8).toFixed(1) + '" y1="' + (o1[1] - u[1] * 8).toFixed(1) + '" x2="' + (o2[0] + u[0] * 8).toFixed(1) + '" y2="' + (o2[1] + u[1] * 8).toFixed(1) + '" ' + ln + '/>';
    var tick = function (o) { var k = 7, tx = (u[0] + n[0]) * k, ty = (u[1] + n[1]) * k; return '<line x1="' + (o[0] - tx).toFixed(1) + '" y1="' + (o[1] - ty).toFixed(1) + '" x2="' + (o[0] + tx).toFixed(1) + '" y2="' + (o[1] + ty).toFixed(1) + '" stroke="' + COR.tr + '" stroke-width="2.4"/>'; };
    h += tick(o1) + tick(o2);
    var ang = Math.atan2(u[1], u[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    var mx = (o1[0] + o2[0]) / 2 + n[0] * (fs * 0.35), my = (o1[1] + o2[1]) / 2 + n[1] * (fs * 0.35), up = Math.abs(ang) < 1 ? -1 : 0;
    if (Math.abs(ang) < 1 && n[1] > 0) { my = (o1[1] + o2[1]) / 2 + fs * 0.95; } else if (Math.abs(ang) < 1) my = (o1[1] + o2[1]) / 2 - 8;
    else if (Math.abs(Math.abs(ang) - 90) < 1) { mx = (o1[0] + o2[0]) / 2 + n[0] * 12; my = (o1[1] + o2[1]) / 2 + fs * 0.35; return h + dimTxt(mx, my, t, fs, n[0] > 0 ? 'start' : 'end', key); }
    else { mx = (o1[0] + o2[0]) / 2 + n[0] * (fs * 0.55); my = (o1[1] + o2[1]) / 2 + n[1] * (fs * 0.55) + fs * 0.35; }
    return h + (Math.abs(ang) < 1 ? dimTxt(mx, my, t, fs, 'middle', key) : '<g transform="rotate(' + ang.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + (my - fs * 0.35).toFixed(1) + ')">' + dimTxt(mx, my, t, fs, 'middle', key) + '</g>');
  }
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
    var xs = c > 0 ? b.x1 : b.x0, zs = b.zs != null && ((c > 0 && b.k === 'tE') || (c < 0 && b.k === 'tD')) ? b.zs : b.z0; // no degrau do rebaixo só aparece a parte de cima
    var ys = zs !== b.z0 && b.ys != null ? b.ys : b.y0;
    if (!b.semLado) h += poly([S(xs, ys, zs), S(xs, b.y1, zs), S(xs, b.y1, b.z1), S(xs, ys, b.z1)], st);
    h += poly([S(b.x0, b.y0, b.z0), S(b.x1, b.y0, b.z0), S(b.x1, b.y0, b.z1), S(b.x0, b.y0, b.z1)], st);
    h += poly([S(b.x0, b.y0, b.z1), S(b.x1, b.y0, b.z1), S(b.x1, b.y1, b.z1), S(b.x0, b.y1, b.z1)], st);
    return h;
  }
  var nClip = 0, CLP = 'hrc', INTER = false, MINI = false, nMini = 0;
  function recorteSvg(r, P, s, ox, oy, z, sw) {
    var S = function (x, y, zz) { var q = P(x, y, zz == null ? z : zz); return [ox + q[0] * s, oy + q[1] * s]; }, h = '', ln = 'fill="none" stroke="' + COR.tr + '" stroke-width="' + sw + '" stroke-linejoin="round"';
    var ret = [S(r.x0, r.y0), S(r.x1, r.y0), S(r.x1, r.y1), S(r.x0, r.y1)];
    var circ = function (cx, cy, rx, ry, zz) { var pts = []; for (var i = 0; i < 48; i++) { var a = i / 48 * Math.PI * 2; pts.push(S(cx + rx * Math.cos(a), cy + ry * Math.sin(a), zz)); } return pts; };
    var bacia = function (dz, so) { // furo com fundo: parede de trás e lateral aparecem por dentro
      var id = CLP + (++nClip), x0 = r.x0, x1 = r.x1, y0 = r.y0, y1 = r.y1;
      if (so) { y0 = r.y1 - Math.max(5, (r.y1 - r.y0) * 0.22); x0 = r.x0 + (r.x1 - r.x0) * 0.08; x1 = r.x1 - (r.x1 - r.x0) * 0.08; }
      var fundo = [S(x0, y0, z - dz), S(x1, y0, z - dz), S(x1, y1, z - dz), S(x0, y1, z - dz)], g2 = '<clipPath id="' + id + '">' + poly(ret, '') + '</clipPath><g clip-path="url(#' + id + ')">';
      g2 += poly(fundo, ln);
      if (so) { g2 += '<line x1="' + ret[0][0] + '" y1="' + ret[0][1] + '" x2="' + fundo[0][0] + '" y2="' + fundo[0][1] + '" ' + ln + '/>' + '<line x1="' + ret[1][0] + '" y1="' + ret[1][1] + '" x2="' + fundo[1][0] + '" y2="' + fundo[1][1] + '" ' + ln + '/>'; }
      else [0, 1, 2, 3].forEach(function (i) { g2 += '<line x1="' + ret[i][0] + '" y1="' + ret[i][1] + '" x2="' + fundo[i][0] + '" y2="' + fundo[i][1] + '" ' + ln + '/>'; });
      return g2 + '</g>' + poly(ret, ln);
    };
    if (r.t === 'reb') {
      // americano: recorte com os cantos arredondados e a borda polida (a frente da pedra continua inteira)
      var arr2 = function (zz, rd) { var L2 = [], cs = [[r.x1 - rd, r.y0 + rd, -90], [r.x1 - rd, r.y1 - rd, 0], [r.x0 + rd, r.y1 - rd, 90], [r.x0 + rd, r.y0 + rd, 180]]; cs.forEach(function (c0) { for (var k = 0; k <= 4; k++) { var an = (c0[2] + k * 22.5) * Math.PI / 180; L2.push(S(c0[0] + rd * Math.cos(an), c0[1] + rd * Math.sin(an), zz)); } }); return L2; };
      var rr2 = Math.min(6, (r.x1 - r.x0) / 4, (r.y1 - r.y0) / 4), retR = arr2(z, rr2), id = CLP + (++nClip), deg = arr2(z - 2.2, Math.max(1, rr2 - 1.5));
      h += '<clipPath id="' + id + '">' + poly(retR, '') + '</clipPath><g clip-path="url(#' + id + ')">' + poly(deg, ln) + '</g>';
      h += poly(retR, 'fill="none" stroke="' + COR.tr + '" stroke-width="' + (sw * 1.45) + '" stroke-linejoin="round"');
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
  function pecaSvg(pc, s, cx0, cy0, idx) { // cx0/cy0: canto sup. esq. da área útil da peça (sem margens)
    var g = geo(pc), P = proj(pc, g), c = KC * sentido(pc), bb = bboxOb(pc), ox = cx0 - bb.x0 * s, oy = cy0 - bb.y0 * s, sw = MINI ? 4 : Math.max(2.6, Math.min(4.6, s * 0.95)), h = '';
    var S = function (x, y, z) { var q = P(x, y, z); return [ox + q[0] * s, oy + q[1] * s]; };
    var R = recortes(pc, g), it = INTER && idx >= 0, W0 = (bb.x1 - bb.x0) * s, H0 = (bb.y1 - bb.y0) * s;
    if (it) { st.lay[idx] = { s: s }; h += '<g data-pcsel="' + idx + '"><rect x="' + (cx0 - 30) + '" y="' + (cy0 - 30) + '" width="' + (W0 + 60) + '" height="' + (H0 + 60) + '" rx="18" fill="#fff" fill-opacity="0"' + (st.sel === idx ? ' stroke="#c9a84c" stroke-width="3" stroke-dasharray="12 8"' : '') + '/>'; }
    var grp = function (gg) { return g.boxes.filter(function (b) { return b.g === gg; }); };
    ordenar(grp('pe'), c).forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); });
    var zR = function (r) { var rn = R.filter(function (o) { return o.n; })[0]; return rn && r.t !== 'cook' && r.x0 >= rn.x0 - 1 && r.x1 <= rn.x1 + 1 ? g.rebZ : g.T; };
    var lajes = ordenar(grp('slab'), c); lajes.sort(function (a, b) { var o = { rebN: 0, rebF: 2 }; return (o[a.k] != null ? o[a.k] : 1) - (o[b.k] != null ? o[b.k] : 1); }); // a pedra do rebaixo (mais baixa) primeiro
    lajes.forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); if (b.k === 'main') R.forEach(function (r) { h += recorteSvg(r, P, s, ox, oy, g.T, sw * 0.85); }); });
    if (g.rebZ !== g.T) R.forEach(function (r) { if (!r.n) h += recorteSvg(r, P, s, ox, oy, zR(r), sw * 0.85); });
    ordenar(grp('fr'), c).forEach(function (b) { h += caixa(b, P, c, s, ox, oy, sw); });
    // medidas no estilo de projeto de arquiteto: linha de cota com linhas de chamada e tracinhos, número verde em cima
    var fs = 36, fs2 = 30, frH = num(pc.fr) > 0 && pc.frF && pc.tipo !== 'prateleira' ? num(pc.fr) : 0, zTop = g.T + frH;
    var rbs = R.filter(function (r) { return r.t === 'reb'; })[0], cortes = [];
    if (rbs) { if (rbs.x0 > 0.5) cortes.push(rbs.x0); if (g.A - rbs.x1 > 0.5) cortes.push(rbs.x1); }
    var temPar = cortes.length > 0, d1 = 34, d2 = temPar ? 92 : 34;
    if (temPar) {
      var xs = [0].concat(cortes, [g.A]);
      for (var ci = 0; ci < xs.length - 1; ci++) {
        var a0 = xs[ci], a1x = xs[ci + 1], kk = a0 === rbs.x0 ? 'rebc' : a1x === rbs.x0 ? 'rx0' : 'rx1';
        h += cota(S(a0, g.Ymax, zTop), S(a1x, g.Ymax, zTop), [0, -1], d1, f1(a1x - a0), fs2, it && idx + '|' + kk);
      }
    }
    h += cota(S(0, g.Ymax, zTop), S(g.A, g.Ymax, zTop), [0, -1], d2, f1(g.A), fs, it && idx + '|A');
    var fora = function (a, b, sx) { var vx = b[0] - a[0], vy = b[1] - a[1], L0 = Math.hypot(vx, vy) || 1, n0 = [vy / L0, -vx / L0]; if (n0[0] * sx < 0) n0 = [-n0[0], -n0[1]]; return n0; };
    if (pc.tipo === 'L') {
      var dir = pc.perna !== 'esq', xo = dir ? g.A : 0, zo = g.T + (num(pc.fr) > 0 && (dir ? pc.frD : pc.frE) ? num(pc.fr) : 0), a1 = S(xo, 0, zo), a2 = S(xo, g.Ymax - g.p, zo);
      h += cota(a1, a2, [dir ? 1 : -1, 0], 22, f1(num(pc.B)), fs, it && idx + '|B');
      var xe = dir ? 0 : g.A, ze = g.T + (num(pc.fr) > 0 && (dir ? pc.frE : pc.frD) ? num(pc.fr) : 0), b1 = S(xe, g.Ymax - g.p, ze), b2 = S(xe, g.Ymax, ze);
      h += cota(b1, b2, [dir ? -1 : 1, 0], 22, f1(g.p), fs2, it && idx + '|p');
      var pB = Math.min(g.A - 5, num(pc.pB, g.p)), f0 = S(dir ? g.A - pB : 0, 0, 0), f2 = S(dir ? g.A : pB, 0, 0);
      h += cota(f0, f2, [0, 1], 30, f1(pB), fs2, it && idx + '|pB');
    } else {
      var esq = sentido(pc) > 0, xl = esq ? 0 : g.A, frL = num(pc.fr) > 0 && (esq ? pc.frE : pc.frD) && pc.tipo !== 'prateleira' ? num(pc.fr) : 0, e1 = S(xl, 0, g.T + frL), e2 = S(xl, g.p, g.T + frL);
      h += cota(e1, e2, [esq ? -1 : 1, 0], 22, f1(g.p), fs2, it && idx + '|p');
    }
    if (frH && !MINI) { var xf = sentido(pc) > 0 ? g.A : 0, h1 = S(xf, g.Ymax, g.T), h2 = S(xf, g.Ymax, zTop); h += cota(h1, h2, [sentido(pc) > 0 ? 1 : -1, 0], 26, f1(frH), 24, it && idx + '|fr'); }
    if (num(pc.qtd) > 1 && !MINI) { var q1 = S(g.A / 2, 0, 0); h += txt(q1[0], q1[1] + 48, num(pc.qtd) + 'x', fs2, 'middle', COR.vd, ' font-weight="700"'); }
    if (it) { // áreas de arrastar: cuba, rebaixo e cooktop
      R.forEach(function (r) {
        var e = r.n ? 0 : 3, zz = r.n ? g.rebZ : zR(r), q = [S(r.x0 - e, r.y0 - e, zz), S(r.x1 + e, r.y0 - e, zz), S(r.x1 + e, r.y1 + e, zz), S(r.x0 - e, r.y1 + e, zz)], cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
        h += '<g data-rc="' + idx + '|' + r.t + '" style="cursor:grab">' + poly(q, 'fill="#e8c96a" fill-opacity="' + (r.n ? '.02' : r.t === 'reb' ? '.1' : '.2') + '" stroke="#c9a84c" stroke-width="2" stroke-dasharray="8 5"');
        if (r.t !== 'reb' || !R.some(function (o) { return o.t === 'cuba'; })) h += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="26" fill="#c9a84c" fill-opacity=".92"/><text x="' + cx.toFixed(1) + '" y="' + (cy + 11).toFixed(1) + '" font-size="32" text-anchor="middle" fill="#1a1408" font-weight="700">⇔</text>';
        else { var cb0 = R.filter(function (o) { return o.t === 'cuba'; })[0], gx = cb0.x0 - r.x0 > r.x1 - cb0.x1 ? (r.x0 + cb0.x0) / 2 : (cb0.x1 + r.x1) / 2, hp = S(gx, (r.y0 + r.y1) / 2, zz); h += '<circle cx="' + hp[0].toFixed(1) + '" cy="' + hp[1].toFixed(1) + '" r="22" fill="#c9a84c" fill-opacity=".92"/><text x="' + hp[0].toFixed(1) + '" y="' + (hp[1] + 9).toFixed(1) + '" font-size="26" text-anchor="middle" fill="#1a1408" font-weight="700">⇔</text>'; }
        h += '</g>';
      });
      h += '</g>';
    }
    return h;
  }
  function frenteSvg(pc, s, x0, y0, idx) { // nicho e placas: vista de frente
    var it = INTER && idx >= 0, A = Math.max(5, num(pc.A)), H = Math.max(5, num(pc.H)), sw = MINI ? 4 : Math.max(2.6, Math.min(4.6, s * 0.95)), h = '', st = 'fill="#fff" stroke="' + COR.tr + '" stroke-width="' + sw + '"';
    if (pc.tipo === 'nicho') {
      var m = 8, pr = Math.max(4, num(pc.prof, 10)), X = x0 + m * s, Y = y0 + m * s, W = A * s, Hh = H * s, d = Math.min(pr * 0.45, A * 0.2) * s, b = Math.min(pr * 0.45, H * 0.2) * s;
      h += '<rect x="' + x0 + '" y="' + y0 + '" width="' + ((A + 2 * m) * s) + '" height="' + ((H + 2 * m) * s) + '" ' + st + '/>';
      h += '<rect x="' + X + '" y="' + Y + '" width="' + W + '" height="' + Hh + '" ' + st + '/>';
      h += '<line x1="' + (X + W - d) + '" y1="' + (Y) + '" x2="' + (X + W - d) + '" y2="' + (Y + Hh - b) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += '<line x1="' + (X) + '" y1="' + (Y + Hh - b) + '" x2="' + (X + W - d) + '" y2="' + (Y + Hh - b) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += '<line x1="' + (X + W - d) + '" y1="' + (Y + Hh - b) + '" x2="' + (X + W) + '" y2="' + (Y + Hh) + '" stroke="' + COR.tr + '" stroke-width="' + sw + '"/>';
      h += dimTxt(X + 14, Y + Hh / 2 + 10, f1(H), 30, 'start', it && idx + '|H') + dimTxt(X + W / 2, Y + Hh - b - 14, f1(A), 30, 'middle', it && idx + '|A');
      h += dimTxt(X + W + m * s + 10, Y + Hh / 2 + 8, '↔ ' + f1(pr), 24, 'start', it && idx + '|prof');
      if (num(pc.qtd) > 1 && !MINI) h += txt(X + W / 2, Y + Hh / 2, num(pc.qtd) + 'x', 30);
    } else {
      h += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (A * s) + '" height="' + (H * s) + '" ' + st + '/>';
      if (!MINI) h += txt(x0 + A * s / 2, y0 + H * s / 2, nomePeca(pc), 26) + (num(pc.qtd) > 1 ? txt(x0 + A * s / 2, y0 + H * s / 2 + 40, num(pc.qtd) + 'x', 26) : '');
      h += dimTxt(x0 + A * s + 12, y0 + H * s / 2 + 10, f1(H), 28, 'start', it && idx + '|H') + dimTxt(x0 + A * s / 2, y0 + H * s + 38, f1(A), 28, 'middle', it && idx + '|A');
    }
    if (it) { var fw = pc.tipo === 'nicho' ? (A + 16) * s : A * s, fh = pc.tipo === 'nicho' ? (H + 16) * s : H * s; st.lay[idx] = { s: s }; h = '<g data-pcsel="' + idx + '"><rect x="' + (x0 - 24) + '" y="' + (y0 - 24) + '" width="' + (fw + 48) + '" height="' + (fh + 48) + '" rx="16" fill="#fff" fill-opacity="0"' + (st.sel === idx ? ' stroke="#c9a84c" stroke-width="3" stroke-dasharray="12 8"' : '') + '/>' + h + '</g>'; }
    return h;
  }

  // ── módulos prontos (como no Promob): escolhe e ajusta no desenho ──
  function mod(t, f) { return function () { var p = novaPeca(t); f && f(p); return p; }; }
  var MODS = [
    { n: 'Pia reta', f: mod('bancada', function (p) { p.A = 180; }) },
    { n: 'Pia com rebaixo americano', f: mod('bancada', function (p) { p.A = 200; p.reb.on = true; }) },
    { n: 'Pia com rebaixo normal', f: mod('bancada', function (p) { p.A = 200; p.reb.on = true; p.reb.tipo = 'normal'; }) },
    { n: 'Pia com cooktop', f: mod('bancada', function (p) { p.A = 240; p.cuba.x = 170; p.cook.on = true; p.cook.x = 55; }) },
    { n: 'Cozinha em L (perna direita)', f: mod('L', function (p) { p.perna = 'dir'; p.cuba.x = 110; }) },
    { n: 'Cozinha em L (perna esquerda)', f: mod('L', function (p) { p.perna = 'esq'; p.frD = false; p.frE = true; p.cuba.ref = 'dir'; p.cuba.x = 110; }) },
    { n: 'Lavatório com cuba', f: mod('lavatorio', function (p) { p.cuba = { tipo: 'retangular', inst: 'embutida', ref: 'esq', x: '', w: 45, h: 30, fy: '' }; }) },
    { n: 'Lavatório esculpido', f: mod('lavatorio', function (p) { p.A = 90; p.cuba = { tipo: 'esculpida', inst: 'embutida', ref: 'esq', x: '', w: 50, h: 35, fy: '' }; }) },
    { n: 'Balcão / ilha', f: mod('bancada', function (p) { p.nome = 'Balcão'; p.A = 150; p.p = 50; p.cuba.tipo = 'nenhuma'; p.frF = false; p.pe = 'dir'; }) },
    { n: 'Prateleira', f: mod('prateleira') },
    { n: 'Nicho', f: mod('nicho') },
    { n: 'Soleira', f: mod('prateleira', function (p) { p.nome = 'Soleira'; p.A = 90; p.p = 15; p.saia = 'nenhuma'; }) },
    { n: 'Peitoril', f: mod('prateleira', function (p) { p.nome = 'Peitoril'; p.A = 120; p.p = 18; p.saiaAlt = 3; }) }
  ];
  function miniSvg(pc) {
    var cl = CLP; MINI = true; CLP = 'hrm' + (++nMini) + '_'; var h = '';
    try {
      if (oblq(pc)) { var bb = bboxOb(pc), w = bb.x1 - bb.x0, hh = bb.y1 - bb.y0, pd = Math.max(w, hh) * 0.07; h = '<svg viewBox="' + (-pd).toFixed(1) + ' ' + (-pd).toFixed(1) + ' ' + (w + 2 * pd).toFixed(1) + ' ' + (hh + 2 * pd).toFixed(1) + '">' + pecaSvg(pc, 1, 0, 0, -1) + '</svg>'; }
      else { var A = num(pc.A), H = num(pc.H), fw = pc.tipo === 'nicho' ? A + 16 : A, fh = pc.tipo === 'nicho' ? H + 16 : H; h = '<svg viewBox="-6 -6 ' + (fw + 12) + ' ' + (fh + 12) + '">' + frenteSvg(pc, 1, 0, 0, -1) + '</svg>'; }
    } finally { MINI = false; CLP = cl; }
    return h;
  }
  var miniCache = null;
  function modsHtml(grade) {
    if (!miniCache) miniCache = MODS.map(function (m) { return miniSvg(m.f()); });
    return '<div class="des-mods' + (grade ? ' g' : '') + '">' + MODS.map(function (m, i) { return '<button type="button" class="des-mod" data-mod="' + i + '">' + miniCache[i] + '<span>' + esc(m.n) + '</span></button>'; }).join('') + '</div>';
  }

  // ── textos automáticos ──
  var NSAIA = { reta: 'sainhas retas', slim: 'sainhas slim', '45': 'sainhas em 45°', boleada: 'sainhas boleadas' };
  function descAuto(d) {
    var ps = d.pecas || [];
    if (ps.length === 1) {
      var pc = ps[0], c = pc.cuba || {}, x = [];
      if (oblq(pc) && (temSaia(pc) || pc.saia === 'slim')) x.push(pc.saia === 'slim' ? 'acabamento slim' : NSAIA[pc.saia]);
      if (pc.reb && pc.reb.on) x.push(rebNormal(pc) ? 'rebaixo normal' : 'rebaixo americano');
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
      if (rb && rb.n) { var np = 1 + (rb.x0 - g.main.x0 > 0.5 ? 1 : 0) + (g.main.x1 - rb.x1 > 0.5 ? 1 : 0); n.push('Rebaixo normal de ' + f1(rb.x1 - rb.x0) + ', início a ' + f1(rb.x0) + ' do canto esquerdo, cortado até a sainha (' + np + ' pedras)'); if (num(pc.fr) > 0 && pc.frF) n.push('Frontão dividido na área molhada, lá com ' + f1(num(pc.fr) + REB_DESCE) + 'cm'); }
      else if (rb) n.push('Rebaixo americano ' + f1(rb.x1 - rb.x0) + 'x' + f1(rb.y1 - rb.y0) + ', início a ' + f1(rb.x0) + ' do canto esquerdo');
      if (cb) {
        var dsq = c.ref === 'dir' ? g.A - cb.cx : cb.cx, lado = c.ref === 'dir' ? 'direito' : 'esquerdo';
        if (rb && vazio(c.x)) n.push('Cuba no centro do rebaixo');
        else if (!vazio(c.x) || pc.tipo === 'L' || g.A > 100) n.push('Centro da cuba: ' + f1(dsq) + ' do canto ' + lado);
        if (cb.f !== 'redonda' && cb.f !== 'oval') n.push('Cuba ' + f1(cb.x1 - cb.x0) + 'x' + f1(cb.y1 - cb.y0) + (cb.f === 'rampada' ? ' esculpida rampada' : cb.f === 'esculpida' ? ' esculpida' : c.inst === 'flush' ? ' flush' : c.inst === 'sobrepor' ? ' de sobrepor' : ''));
        else n.push('Cuba ' + (cb.f === 'redonda' ? 'redonda Ø ' + f1(cb.x1 - cb.x0) : 'oval ' + f1(cb.x1 - cb.x0) + 'x' + f1(cb.y1 - cb.y0)) + (c.inst === 'sobrepor' ? ' de sobrepor' : ''));
      }
      if (ck) n.push('Cooktop ' + f1(ck.x1 - ck.x0) + 'x' + f1(ck.y1 - ck.y0) + ', centro a ' + f1(ck.cx) + ' do canto esquerdo');
      if (pc.saia === 'slim') n.push('Acabamento slim (2 cm, só a espessura da pedra)');
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
      ps.forEach(function (pc, i) { var o = L[i]; h += oblq(pc) ? pecaSvg(pc, o.s, o.x, o.y, i) : frenteSvg(pc, o.s, o.x, o.y, i); });
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
      if (b.k === 'rebF') return;
      if (b.g === 'slab') add(b.k === 'rebN' ? 'Pedra do rebaixo' : b.k === 'tE' ? 'Tampo à esquerda do rebaixo' : b.k === 'tD' ? 'Tampo à direita do rebaixo' : pc.tipo === 'L' ? (b.k === 'main' ? 'Bancada (parte maior)' : 'Bancada (perna do L)') : nm, 'bancada', b.x1 - b.x0, b.y1 - b.y0);
      if (b.g === 'fr') add(b.k === 'frM' ? 'Frontão da área molhada' : 'Frontão', 'frontao', Math.max(b.x1 - b.x0, b.y1 - b.y0), b.z1 - b.z0);
      if (b.g === 'pe') add('Pé estrutural', 'outro', b.z1 - b.z0, b.y1 - b.y0);
    });
    if (temSaia(pc)) {
      var sa = num(pc.saiaAlt), nmS = 'Saia ' + ({ reta: 'reta', slim: 'slim', '45': 'em 45°', boleada: 'boleada' }[pc.saia]), A2 = g.A, p = g.p;
      if (pc.tipo === 'L') {
        var pB = Math.min(A2 - 5, num(pc.pB, p)), B = num(pc.B) + p, dir = pc.perna !== 'esq';
        add(nmS, 'saia', A2 - pB, sa); add(nmS, 'saia', pB, sa); add(nmS, 'saia', B - p, sa);
        if (dir ? !pc.frE : !pc.frD) add(nmS, 'saia', p, sa);
        if (dir ? !pc.frD : !pc.frE) add(nmS, 'saia', B, sa);
      } else { var rn0 = rebNormal(pc) && recortes(pc, g).filter(function (r) { return r.n; })[0]; if (rn0) { if (rn0.x0 > 0.5) add(nmS, 'saia', rn0.x0, sa); add(nmS + ' (área molhada)', 'saia', rn0.x1 - rn0.x0, sa); if (A2 - rn0.x1 > 0.5) add(nmS, 'saia', A2 - rn0.x1, sa); } else add(nmS, 'saia', A2, sa); if (!pc.frE) add(nmS, 'saia', p, sa); if (!pc.frD) add(nmS, 'saia', p, sa); }
    }
    if (pc.reb && pc.reb.on && !rebNormal(pc)) add('Tampo do rebaixo americano', 'tampo', num(pc.reb.c), num(pc.reb.l));
    return L;
  }
  function itemProducao(pc) {
    var sv = [], c = pc.cuba || {}, temC = oblq(pc) && c.tipo && c.tipo !== 'nenhuma' && pc.tipo !== 'prateleira';
    if (temC) sv.push(pc.tipo === 'lavatorio' ? 'cuba_lav' : 'cuba_coz');
    if (pc.cook && pc.cook.on) sv.push('cook');
    if (pc.reb && pc.reb.on && pc.tipo !== 'prateleira') sv.push(rebNormal(pc) ? 'reb_n' : 'reb_a');
    if (oblq(pc) && (temSaia(pc) || pc.saia === 'slim')) sv.push({ reta: 's_reta', slim: 's_slim', boleada: 's_boleada', '45': 's_45' }[pc.saia] || 's_reta');
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

  // ── v3: escrever o projeto como fala (sem IA, sem custo) ──
  var NUM = '(\\d+(?:[.,]\\d+)?)';
  function nn(t) { return num(t); }
  function semAc(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var PALNUM = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };
  function tipoDe(t) {
    var achados = [[/cozinha em l\b|\bem l\b|\bl\b/, 'L'], [/lavat|banheiro/, 'lavatorio'], [/pratel/, 'prateleira'], [/\bpia\b|bancada|balcao|ilha/, 'bancada'], [/nicho/, 'nicho'], [/divis|placa|soleira|peitor|tampo|degrau/, 'placa']];
    var best = null; achados.forEach(function (a) { var m = a[0].exec(t); if (m && (!best || m.index < best.i)) best = { i: m.index, t: a[1] }; });
    return best ? best.t : null;
  }
  function interpretar(texto) {
    var segs = String(texto || '').split(/\n+|;|\s\+\s/).map(function (x) { return x.trim(); }).filter(Boolean), out = [];
    segs.forEach(function (seg) {
      seg = seg.normalize('NFC'); var t = semAc(seg), tp = tipoDe(t);
      if (!tp) { if (out.length) { out[out.length - 1]._resto = (out[out.length - 1]._resto || []).concat([seg]); } return; }
      var pc = novaPeca(tp), mq;
      if (tp === 'L') { pc.frD = false; }
      if (/balcao/.test(t)) pc.nome = 'Balcão'; else if (/ilha/.test(t)) pc.nome = 'Ilha'; else if (/soleira/.test(t)) pc.nome = 'Soleira'; else if (/peitor/.test(t)) pc.nome = 'Peitoril'; else if (/divis/.test(t)) pc.nome = 'Divisória'; else if (/degrau/.test(t)) pc.nome = 'Degrau'; else if (tp === 'placa' && /tampo/.test(t)) pc.nome = 'Tampo';
      if (/balcao|ilha/.test(t) && !/cuba|rebaixo|bojo|area molhada/.test(t)) pc.cuba.tipo = 'nenhuma';
      if ((mq = /^(\d+)\s*x?\s+(?=[a-z])/.exec(t)) || (mq = /^(um|uma|dois|duas|tres|quatro|cinco|seis)\s/.exec(t)) || (mq = /\b(\d+)\s*x\b(?!\s*\d)/.exec(t)) || (mq = /\b(\d+)\s*(?:unidades|pecas|vezes)\b/.exec(t))) pc.qtd = PALNUM[mq[1]] || +mq[1];
      var temFr = false, frLados = null, ctx = '', dimsOk = false, obs = [];
      var SEP = /,(?!\d)|;|\.\s|\s+com\s+|\s+e\s+(?=[a-z])|\s(?<!\bsem\s)(?=(?:sainhas?|saias?|frontao|frontoes|espelho|cuba|bojo|rebaixo|area molhada|cooktop|fogao|pe estrutural|largura|profundidade|altura|perna (?:esq|dir|pra|para|na|a)|canto (?:na|no|da|do|fica) (?:perna|fundo)|sem (?:sainha|saia|frontao|frontoes|cuba)|valvula|vista)\b)/g, cl = [], orig = [], ini = 0, mm;
      while ((mm = SEP.exec(t))) { if (mm.index > ini) { cl.push(t.slice(ini, mm.index).trim()); orig.push(seg.slice(ini, mm.index).trim()); } ini = mm.index + mm[0].length; if (!mm[0].length) SEP.lastIndex++; }
      cl.push(t.slice(ini).trim()); orig.push(seg.slice(ini).trim());
      cl.forEach(function (c, ci) { if (!c) return;
        var usou = false, m;
        if (/sem (sainha|saia)/.test(c)) { pc.saia = 'nenhuma'; return; }
        if (/sem frontao|sem frontoes/.test(c)) { pc.frF = pc.frE = pc.frD = false; temFr = 'nao'; return; }
        if (/sem cuba/.test(c)) { pc.cuba.tipo = 'nenhuma'; return; }
        if (/rebaixo|area molhada/.test(c)) { ctx = 'reb'; pc.reb.on = true; usou = true; if (/american/.test(c)) pc.reb.tipo = 'americano'; else if (/normal|comum|simples|separad/.test(c)) pc.reb.tipo = 'normal'; }
        else if (/cooktop|fogao/.test(c)) { ctx = 'cook'; pc.cook.on = true; usou = true; }
        else if (/cuba|bojo/.test(c)) { ctx = 'cuba'; usou = true; if (pc.cuba.tipo === 'nenhuma') pc.cuba.tipo = 'retangular'; }
        else if (/\bpe\b|pe estrutural|pe de apoio/.test(c)) { ctx = 'pe'; pc.pe = /esquerd/.test(c) ? 'esq' : 'dir'; usou = true; }
        else if (/sainha|saia/.test(c)) { ctx = 'saia'; usou = true; if (pc.saia === 'nenhuma') pc.saia = 'reta'; }
        else if (/frontao|frontoes|espelho/.test(c)) { ctx = 'fr'; usou = true; temFr = true; }
        if (/esculp/.test(c) && (ctx === 'cuba' || tp === 'lavatorio')) { pc.cuba.tipo = /rampad/.test(c) ? 'rampada' : 'esculpida'; pc.cuba.w = 50; pc.cuba.h = 35; ctx = 'cuba'; usou = true; }
        if (ctx === 'cuba' || /cuba/.test(c)) {
          if (/redond/.test(c)) { pc.cuba.tipo = 'redonda'; pc.cuba.w = pc.cuba.h = pc.tipo === 'lavatorio' ? 40 : 45; }
          if (/oval/.test(c)) { pc.cuba.tipo = 'oval'; pc.cuba.w = 48; pc.cuba.h = 36; }
          if (/retang|quadrad/.test(c)) { pc.cuba.tipo = 'retangular'; if (pc.tipo === 'lavatorio') { pc.cuba.w = 45; pc.cuba.h = 30; } }
          if (/sobrepor/.test(c)) pc.cuba.inst = 'sobrepor'; if (/embut/.test(c)) pc.cuba.inst = 'embutida'; if (/flush/.test(c)) pc.cuba.inst = 'flush';
        }
        if (/saia|sainha/.test(c) || ctx === 'saia') { if (/45/.test(c)) { pc.saia = '45'; if (num(pc.saiaAlt) === 4 || num(pc.saiaAlt) === 10) pc.saiaAlt = 6; } else if (/slim/.test(c)) pc.saia = 'slim'; else if (/bolead/.test(c)) pc.saia = 'boleada'; else if (/reta/.test(c)) pc.saia = 'reta'; }
        if (/perna|lado da perna|l (pra|para)/.test(c) || (tp === 'L' && /^(pra |para )?(a )?(esquerda|direita)$/.test(c))) { if (/esquerd/.test(c)) pc.perna = 'esq'; if (/direit/.test(c)) pc.perna = 'dir'; usou = true; }
        if (/canto (na|da|fica na) perna/.test(c)) { pc.emenda = 'perna'; usou = true; } if (/canto (no|do|fica no) fundo/.test(c)) { pc.emenda = 'principal'; usou = true; }
        if (/vista|fundo p/.test(c)) { if (/esquerd/.test(c)) pc.vista = -1; if (/direit/.test(c)) pc.vista = 1; usou = true; }
        if (ctx === 'fr' && /lados|laterais|3 lados|tres lados/.test(c)) { frLados = 'ambos'; }
        else if (ctx === 'fr' && /lado esquerdo|esquerda/.test(c)) frLados = frLados === 'dir' ? 'ambos' : 'esq';
        else if (ctx === 'fr' && /lado direito|direita/.test(c)) frLados = frLados === 'esq' ? 'ambos' : 'dir';
        // medidas: N x M (x K) ou N por M
        var dm = new RegExp(NUM + '\\s*(?:x|por|\\*)\\s*' + NUM + '(?:\\s*(?:x|por)\\s*' + NUM + ')?').exec(c), un = new RegExp(NUM).exec(c), v1 = un ? nn(un[1]) : null;
        var lado = /direit/.test(c) ? 'dir' : 'esq';
        if (/inicio/.test(c) && v1 != null && !dm) { pc.reb.on = true; pc.reb.x = v1; return; }
        if (ctx === 'reb' && (usou || /^(de |a |com )?\d/.test(c) || /canto/.test(c))) {
          if (dm) { pc.reb.c = nn(dm[1]); pc.reb.l = nn(dm[2]); } else if (v1 != null && /canto|inicio|afastad|distan/.test(c)) pc.reb.x = lado === 'dir' ? '' : v1; else if (v1 != null) pc.reb.c = v1;
          return;
        }
        if (ctx === 'cuba' && (usou || /^(de |a |no |com )?\d/.test(c) || /canto|centro|lado/.test(c))) {
          if (dm) { pc.cuba.w = nn(dm[1]); pc.cuba.h = nn(dm[2]); }
          var pos = new RegExp(NUM + '\\s*(?:cm)?\\s*(?:do|da|de|ate o|pro|para o)?\\s*(?:canto|lado|ponta|parede)').exec(c) || new RegExp('(?:canto|lado)\\s*(?:esquerdo|direito)[^0-9]*' + NUM).exec(c) || new RegExp('(?:centro|meio)[^0-9]*' + NUM).exec(c) || (/afastad|distan/.test(c) ? un : null);
          if (pos) { var pv = nn(pos[1]); if (/afastad/.test(c) && !/centro/.test(c)) pv += num(pc.cuba.w) / 2; pc.cuba.x = pv; pc.cuba.ref = lado; }
          else if (!dm && v1 != null && /^(de )?\d/.test(c)) { pc.cuba.w = v1; if (pc.cuba.tipo === 'redonda') pc.cuba.h = v1; }
          if (/no centro|no meio/.test(c) && !pos) pc.cuba.x = '';
          return;
        }
        if (ctx === 'cook' && (usou || /^\d/.test(c) || /canto/.test(c))) {
          if (dm) { pc.cook.w = nn(dm[1]); pc.cook.h = nn(dm[2]); }
          var pk = new RegExp(NUM + '\\s*(?:cm)?\\s*(?:do|da)?\\s*canto').exec(c); if (pk) pc.cook.x = lado === 'dir' ? Math.max(0, num(pc.A) - nn(pk[1])) : nn(pk[1]);
          return;
        }
        if (ctx === 'pe' && v1 != null) { pc.peAlt = v1; return; }
        if (ctx === 'saia' && v1 != null && !/45/.test(String(v1)) ) { pc.saiaAlt = v1; return; }
        if (ctx === 'saia' && v1 != null) { var m45 = c.replace(/em 45|45 ?(°|graus)?/g, ''); var u2 = new RegExp(NUM).exec(m45); if (u2) pc.saiaAlt = nn(u2[1]); return; }
        if (ctx === 'fr' && v1 != null) { pc.fr = v1; return; }
        if (ctx === 'fr' && /padrao/.test(c)) { pc.fr = 10; return; }
        if (usou && ctx) return;
        // medidas da peça
        if ((m = new RegExp('largura(?: da perna)?\\s*(?:de)?\\s*' + NUM).exec(c)) || (m = new RegExp(NUM + '\\s*(?:cm)?\\s*de largura').exec(c))) { if (/perna/.test(c)) pc.pB = nn(m[1]); else { pc.p = nn(m[1]); pc.pB = nn(m[1]); } return; }
        if ((m = new RegExp('profundidade\\s*(?:de)?\\s*' + NUM).exec(c))) { if (tp === 'nicho') pc.prof = nn(m[1]); else { pc.p = nn(m[1]); pc.pB = nn(m[1]); } return; }
        if ((m = new RegExp('altura\\s*(?:de)?\\s*' + NUM).exec(c))) { pc.H = nn(m[1]); return; }
        if ((m = new RegExp('(?:comprimento|fundo|parede)\\s*(?:de)?\\s*' + NUM).exec(c))) { pc.A = nn(m[1]); return; }
        if ((m = new RegExp('perna\\s*(?:de)?\\s*' + NUM).exec(c))) { pc.B = nn(m[1]); return; }
        if (dm && !dimsOk) {
          dimsOk = true;
          if (tp === 'L') { pc.A = nn(dm[1]); pc.B = nn(dm[2]); if (dm[3]) { pc.p = pc.pB = nn(dm[3]); } }
          else if (tp === 'nicho') { pc.A = nn(dm[1]); pc.H = nn(dm[2]); if (dm[3]) pc.prof = nn(dm[3]); }
          else if (tp === 'placa') { pc.A = nn(dm[1]); pc.H = nn(dm[2]); }
          else { pc.A = nn(dm[1]); pc.p = nn(dm[2]); }
          return;
        }
        if (ci > 0 && !usou && !/\d/.test(c) && c.length > 2) obs.push(orig[ci] || c);
      });
      if (temFr === true || frLados) { pc.frF = true; }
      if (tp === 'L' && temFr !== 'nao') { if (pc.perna === 'esq') pc.frE = true; else pc.frD = true; }
      if (frLados === 'ambos') { pc.frE = pc.frD = true; } else if (frLados === 'esq') pc.frE = true; else if (frLados === 'dir') pc.frD = true;
      if (pc.reb.on && pc.cuba.tipo === 'nenhuma') pc.cuba.tipo = 'retangular';
      if (obs.length) pc.obs = obs.join(', ');
      out.push(pc);
    });
    out.forEach(function (pc) { if (pc._resto) { pc.obs = (pc.obs ? pc.obs + ', ' : '') + pc._resto.join(', '); delete pc._resto; } });
    return out;
  }
  function entendi(pc) {
    var x = [(num(pc.qtd) > 1 ? num(pc.qtd) + '× ' : '') + nomePeca(pc)];
    if (pc.tipo === 'L') x.push(f1(num(pc.A)) + ' + perna ' + f1(num(pc.B)) + ' (' + (pc.perna === 'esq' ? 'esquerda' : 'direita') + '), largura ' + f1(num(pc.p)));
    else if (oblq(pc)) x.push(f1(num(pc.A)) + ' × ' + f1(num(pc.p)));
    else x.push(f1(num(pc.A)) + ' × ' + f1(num(pc.H)) + (pc.tipo === 'nicho' ? ', prof. ' + f1(num(pc.prof)) : ''));
    if (oblq(pc)) {
      if (pc.saia === 'slim') x.push('acabamento slim (só a espessura)');
      if (temSaia(pc)) x.push('sainha ' + ({ reta: 'reta', slim: 'slim', '45': 'em 45°', boleada: 'boleada' }[pc.saia]) + ' de ' + f1(num(pc.saiaAlt)));
      var fl = []; if (pc.frF) fl.push('fundo'); if (pc.frE) fl.push('esquerdo'); if (pc.frD) fl.push('direito');
      if (fl.length && pc.tipo !== 'prateleira') x.push('frontão ' + f1(num(pc.fr)) + ' (' + fl.join(', ') + ')');
      var c = pc.cuba; if (c.tipo !== 'nenhuma' && pc.tipo !== 'prateleira') x.push('cuba ' + ({ retangular: '', redonda: 'redonda ', oval: 'oval ', esculpida: 'esculpida ', rampada: 'rampada ' }[c.tipo]) + (c.tipo === 'redonda' ? 'Ø' + f1(num(c.w)) : f1(num(c.w)) + '×' + f1(num(c.h))) + (c.inst === 'sobrepor' && !/esc|ramp/.test(c.tipo) ? ' de sobrepor' : c.inst === 'flush' ? ' flush' : '') + (vazio(c.x) ? (pc.reb.on ? ' no centro do rebaixo' : ' no meio') : ' a ' + f1(num(c.x)) + ' do canto ' + (c.ref === 'dir' ? 'direito' : 'esquerdo')));
      if (pc.reb.on) x.push((rebNormal(pc) ? 'rebaixo normal ' + f1(num(pc.reb.c)) : 'rebaixo americano ' + f1(num(pc.reb.c)) + '×' + f1(num(pc.reb.l))) + (vazio(pc.reb.x) ? '' : ' (início a ' + f1(num(pc.reb.x)) + ')'));
      if (pc.cook.on) x.push('cooktop' + (vazio(pc.cook.x) ? '' : ' a ' + f1(num(pc.cook.x))));
      if (pc.pe !== 'nenhum') x.push('pé ' + f1(num(pc.peAlt)) + ' no lado ' + (pc.pe === 'dir' ? 'direito' : 'esquerdo'));
    }
    if (pc.obs) x.push('obs.: ' + pc.obs);
    return x.join(' · ');
  }
  // v4: puxar o projeto de um orçamento salvo no app (hr_q): cada ambiente vira uma linha do texto
  function orcamentos() { try { var l = JSON.parse(localStorage.getItem('hr_q') || '[]') || []; return (Array.isArray(l) ? l : []).filter(function (q) { return q && (q.ambSnap || []).length; }).slice(-40).reverse(); } catch (e) { return []; } }
  function textoDoOrcamento(q) {
    var L = [];
    (q.ambSnap || []).forEach(function (a) {
      var t = semAc(a.tipo || ''), sv = Object.keys(a.svState || {}), pcs = (a.pecas || []).filter(function (p) { return +p.w > 0 && +p.h > 0; }); if (!pcs.length) return;
      var lavC = /lavat|banheir|lavabo/.test(t) || sv.indexOf('cuba_lav') >= 0 || (a.selCuba && a.selCuba.tipo === 'lav');
      if (lavC) { sv = sv.filter(function (k) { return !/^reb_|^cook/.test(k); }); if (!/lavat|banheir|lavabo/.test(t)) t = 'lavatorio ' + t; }
      var ex = []; if (sv.indexOf('s_45') >= 0) ex.push('sainha 45'); else if (sv.indexOf('s_reta') >= 0) ex.push('sainha reta'); else if (sv.indexOf('s_slim') >= 0) ex.push('sainha slim'); else if (sv.indexOf('s_boleada') >= 0) ex.push('sainha boleada');
      if (sv.indexOf('frontao') >= 0 || sv.indexOf('frontao_chf') >= 0) ex.push('frontão 10'); if (sv.indexOf('reb_a') >= 0) ex.push('rebaixo americano'); else if (sv.indexOf('reb_n') >= 0) ex.push('rebaixo normal');
      if (sv.indexOf('cook') >= 0) ex.push('cooktop');
      var ci = ''; [a, a.selCuba || {}].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { var v = o[k]; if (typeof v === 'string' && /^(sobrepor|embutir|embutida|flush)$/i.test(v)) ci = v.toLowerCase(); }); });
      if (a.selCuba) { var cat = null; try { cat = ((a.selCuba.tipo === 'lav' ? (window.CFG || {}).lav : (window.CFG || {}).coz) || []).filter(function (x) { return x.id === a.selCuba.id; })[0]; } catch (e) {}
        var ct = semAc([ci, a.selCuba.nm, cat && cat.tipo, cat && cat.nm].join(' ')), forma = /esculp/.test(ct) ? 'esculpida' : /redond/.test(ct) ? 'redonda' : /oval/.test(ct) ? 'oval' : 'retangular', dm = cat && /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/.exec(String(cat.dim || ''));
        ex.push('cuba ' + (forma === 'esculpida' ? 'esculpida' : forma + (/sobrep|apoio/.test(ct) ? ' de sobrepor' : /flush/.test(ct) ? ' flush' : ' embutida')) + (dm ? ' ' + dm[1] + 'x' + dm[2] : '')); }
      if (/soleira|peitoril|filete|rodape|degrau/.test(t)) { var nm = /soleira/.test(t) ? 'soleira' : /peitoril/.test(t) ? 'peitoril' : 'placa'; pcs.forEach(function (p) { L.push((+p.q > 1 ? (+p.q) + ' ' + nm + (nm === 'peitoril' ? 'is' : 's') : nm) + ' ' + f1(+p.w) + ' x ' + f1(+p.h)); }); return; }
      var grandes = pcs.filter(function (p) { return Math.min(+p.w, +p.h) >= 30; }).sort(function (x, y) { return y.w * y.h - x.w * x.h; }), m = grandes[0] || pcs[0], lav = lavC;
      if (!lav && grandes.length >= 2 && /cozinha|pia|bancada|gourmet/.test(t)) { var a2 = grandes[1]; L.push('Cozinha em L ' + f1(Math.max(+m.w, +m.h)) + ' x ' + f1(Math.max(+a2.w, +a2.h)) + ', largura ' + f1(Math.min(+m.w, +m.h)) + (ex.length ? ', ' + ex.join(', ') : '')); return; }
      var nmA = lav ? 'Lavatório' : /cozinha|pia|bancada|gourmet|balc/.test(t) ? 'Pia' : /pratel/.test(t) ? 'Prateleira' : 'Bancada';
      L.push(((+m.q || 1) > 1 ? (+m.q) + ' ' : '') + nmA + ' ' + f1(Math.max(+m.w, +m.h)) + ' x ' + f1(Math.min(+m.w, +m.h)) + (ex.length ? ', ' + ex.join(', ') : ''));
    });
    return L.join('\n');
  }
  function pecasDoPedido(ped) {
    var out = [];
    (ped.itens || []).forEach(function (it) {
      var t = semAc(it.ambiente || ''), sv = it.sv || [], pcs = (it.pecas || []).filter(function (p) { return p.comp > 0 && p.larg > 0; }); if (!pcs.length) return;
      var lav = /lavat|banheir|lavabo/.test(t) || sv.indexOf('cuba_lav') >= 0;
      var tampos = pcs.filter(function (p) { return (p.tipo === 'bancada' || p.tipo === 'tampo' || !p.tipo) && Math.min(p.comp, p.larg) >= 25; }).sort(function (a, b) { return b.comp * b.larg - a.comp * a.larg; });
      var fr = pcs.filter(function (p) { return p.tipo === 'frontao'; })[0], temSaiaP = pcs.some(function (p) { return p.tipo === 'saia'; });
      if (/soleira|peitoril|filete|rodape|degrau/.test(t) || !tampos.length) { pcs.forEach(function (p) { var q = novaPeca('prateleira'); q.nome = /soleira/.test(t) ? 'Soleira' : /peitoril/.test(t) ? 'Peitoril' : (p.rot || 'Peça'); q.A = Math.max(p.comp, p.larg); q.p = Math.min(p.comp, p.larg); q.qtd = p.qtd; q.saia = 'nenhuma'; out.push(q); }); return; }
      var m = tampos[0], L = !lav && tampos.length >= 2 && /cozinha|pia|bancada|gourmet/.test(t), pc = novaPeca(lav ? 'lavatorio' : L ? 'L' : 'bancada');
      pc.A = Math.max(m.comp, m.larg); pc.p = Math.min(m.comp, m.larg); pc.qtd = m.qtd || 1;
      if (L) { var b = tampos[1]; pc.B = Math.max(b.comp, b.larg); pc.pB = Math.min(b.comp, b.larg); pc.Bv = 2; }
      if (/balc|ilha/.test(t)) pc.nome = /ilha/.test(t) ? 'Ilha' : 'Balcão';
      pc.saia = it.saia || (temSaiaP ? 'reta' : 'nenhuma'); pc.saiaAlt = pc.saia === '45' ? 6 : lav ? 10 : 4;
      if (fr) { pc.frF = true; pc.fr = Math.min(fr.comp, fr.larg); } else { pc.frF = pc.frE = pc.frD = false; }
      var c = pc.cuba, ci = String(it.cubaInst || '');
      if (it.cuba) { c.tipo = /^esc/.test(ci) ? 'esculpida' : 'retangular'; c.inst = ci === 'sobrepor' ? 'sobrepor' : ci === 'flush' ? 'flush' : 'embutida'; if (c.tipo === 'esculpida') { c.w = 50; c.h = 35; } else if (lav) { c.w = 45; c.h = 30; } else { c.w = 56; c.h = 34; } c.x = ''; }
      else c.tipo = 'nenhuma';
      if (!lav && it.rebaixo) { pc.reb.on = true; pc.reb.tipo = it.rebaixo; }
      pc.cook.on = !lav && !!it.cook;
      out.push(pc);
    });
    return out;
  }
  var EXEMPLOS = [
    'Cozinha em L 250 x 100, largura 60, perna esquerda, sainha 45, frontão 10, rebaixo americano 120x48, cuba a 155 do canto esquerdo',
    'Pia 206 x 60, sainha 45, frontão 10 nos lados, cuba a 92 do canto direito, cooktop a 38 do canto esquerdo',
    'Lavatório 80 x 45, sainha reta 10, frontão 10, cuba redonda embutida\nPrateleira 80 x 35, sainha 4',
    '2 lavatórios 120 x 45, sainha reta 12, frontão padrão, cuba oval\n3 divisórias 40 x 80',
    'Lavatório 80 x 50, sainha 20, cuba esculpida rampada, válvula oculta\nNicho 67 x 54, profundidade 10'
  ];

  // ── tela ──
  var CSS = '#hrDes{position:fixed;inset:0;z-index:9990;background:#0a0908;color:#efe9dc;display:flex;flex-direction:column;font-family:Outfit,inherit}#hrDes *{box-sizing:border-box}'
    + '.des-top{display:flex;align-items:center;gap:10px;padding:12px;padding-top:max(12px,env(safe-area-inset-top));background:linear-gradient(180deg,rgba(26,22,14,.96),rgba(14,12,9,.92));border-bottom:1px solid rgba(201,168,76,.18)}'
    + '.des-top b{font-family:"Cormorant Garamond",serif;font-size:1.35rem;color:#f0d78c}.des-sub{font-size:.72rem;color:#9a917e}'
    + '.des-ic{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);color:#e8c96a;min-width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;flex:none;padding:0 10px}'
    + '.des-main{flex:1;overflow:auto;display:flex;flex-wrap:wrap;gap:12px;padding:12px 12px 110px;align-items:flex-start}'
    + '.des-cv{flex:1 1 360px;max-width:560px;background:#f6f6f4;border-radius:12px;overflow:hidden;position:relative;cursor:zoom-in;box-shadow:0 6px 24px rgba(0,0,0,.4)}.des-cv svg{width:100%;height:auto;display:block}'
    + '.des-cv .lupa{position:absolute;right:8px;top:8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:10px;padding:7px 11px;font-size:.76rem;cursor:pointer}.des-cv{cursor:default!important}.des-cv svg{touch-action:pan-y pinch-zoom}'
    + '.des-tip{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:rgba(26,20,8,.92);color:#f0d78c;padding:8px 13px;border-radius:11px;font-size:.82rem;font-weight:700;display:none;pointer-events:none;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35)}'
    + '.des-mods{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}.des-mods.g{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible}.des-mod{flex:0 0 100px;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:12px;background:#f6f6f4;border:2px solid transparent;padding:6px 4px 7px;color:#33302a;font-size:.66rem;font-weight:700;line-height:1.15;cursor:pointer;font-family:inherit}.des-mod:active{border-color:#c9a84c}.des-mod svg{width:100%;height:54px}'
    + '.des-tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:9px}.des-tabs button{flex:0 0 auto;padding:7px 11px;border-radius:20px;border:1px solid rgba(201,168,76,.3);background:transparent;color:#c9bfa6;font-size:.76rem;font-weight:700;cursor:pointer}.des-tabs button.on{background:#c9a84c;color:#1a1408}'
    + '.des-selpc{border-color:rgba(201,168,76,.35);background:rgba(201,168,76,.06)}.des-g4{display:grid;grid-template-columns:1fr 1fr 1fr .7fr;gap:7px;margin-top:9px}'
    + '.des-num{position:fixed;inset:0;z-index:9996;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}.des-num .cx{width:100%;max-width:480px;background:#1a1712;border-radius:18px 18px 0 0;padding:16px 16px max(16px,env(safe-area-inset-bottom));border-top:1px solid rgba(201,168,76,.3)}.des-num .t{color:#f0d78c;font-weight:800;margin-bottom:10px}.des-num input{width:100%;padding:14px;border-radius:12px;background:#0f0d0a;color:#fff;border:1px solid #c9a84c;font-size:1.6rem;font-weight:800;text-align:center;font-family:inherit}.des-num .b{display:flex;gap:8px;margin-top:12px}.des-num .b button{flex:1;padding:13px;border-radius:12px;border:1px solid rgba(201,168,76,.3);background:transparent;color:#c9bfa6;font-weight:800;font-size:.95rem}.des-num .b .ok{background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;border:none}'
    + '@media(min-width:900px){.des-cv{position:sticky;top:0}}'
    + '.des-pn{flex:1 1 320px;max-width:560px;min-width:0}.des-cv{min-width:0}.des-sec{border-radius:14px;padding:12px;margin-bottom:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}'
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
    + '.des-dica{font-size:.74rem;color:#9a917e;margin-top:6px;line-height:1.4}.des-txt{min-height:120px;font-size:1rem;line-height:1.45}'
    + '.des-ent{font-size:.82rem;color:#d7f0dc;background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:7px 9px;margin-top:7px;line-height:1.4}.des-ex{margin-top:9px;font-size:.78rem;color:#c9a84c}.des-ex summary{cursor:pointer}.des-exi{margin-top:6px;padding:8px;border-radius:9px;background:#16130e;color:#c9bfa6;cursor:pointer;line-height:1.35}'
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
        h += '<div class="des-g">' + campo('A', 'Comprimento (fundo)', pc.A, true) + campo('B', 'Perna (sem a largura da pia)', pc.B, true) + campo('p', 'Largura', pc.p, true) + '</div>';
        h += '<div class="des-g2">' + campo('pB', 'Largura da perna', pc.pB, true) + '<div><span class="des-l">Quem fica com o canto</span>' + chips('emenda', pc.emenda, [['principal', 'Fundo'], ['perna', 'Perna']]) + '</div></div>';
      } else h += '<div class="des-g2">' + campo('A', 'Comprimento', pc.A, true) + campo('p', 'Largura', pc.p, true) + '</div>';
      h += '<span class="des-l" style="margin-top:9px">Sainha</span>' + chips('saia', pc.saia, SAIAS) + (pc.saia !== 'nenhuma' && pc.saia !== 'slim' ? '<div class="des-g2">' + campo('saiaAlt', 'Altura da sainha (cm)', pc.saiaAlt, true) + '<div></div></div>' : '');
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
        h += '<div class="des-ch" style="margin-top:9px">' + lig('reb.on', rb.on, 'Rebaixo') + lig('cook.on', pc.cook && pc.cook.on, 'Cooktop') + '</div>' + rebHtml(pc);
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
  function entendiHtml() {
    var d = st.d, ps = d.pecas || [];
    if (!ps.length) return '<div class="des-dica">Escreva acima e o desenho aparece sozinho.</div>';
    return ps.map(function (pc, i) { return '<div class="des-ent">✅ ' + esc(entendi(pc)) + '</div>' + avisos(pc).map(function (a) { return '<div class="des-av">⚠️ ' + esc(a) + '</div>'; }).join(''); }).join('');
  }
  function barraPeca(pc, i) { // a peça escolhida: medidas, acabamento e detalhes, tudo curto
    var ps = st.d.pecas, t = TIPOS[pc.tipo] || {}, h = '<div class="des-sec des-selpc" data-pc="' + i + '">';
    if (ps.length > 1) h += '<div class="des-tabs">' + ps.map(function (q, j) { return '<button type="button" data-selpc="' + j + '" class="' + (j === i ? 'on' : '') + '">' + (j + 1) + '. ' + esc(nomePeca(q)) + '</button>'; }).join('') + '</div>';
    h += '<div class="des-pc-h" style="cursor:default"><span style="font-size:1.1rem">' + (t.ic || '▬') + '</span><b>' + esc(nomePeca(pc)) + '</b><button class="des-x" data-dup="' + i + '" style="border-color:rgba(201,168,76,.35);color:#e8c96a">⧉ Duplicar</button><button class="des-x" data-rmpc="' + i + '">🗑</button></div>';
    if (oblq(pc)) {
      if (pc.tipo === 'L') h += '<div class="des-g4">' + campo('A', 'Fundo', pc.A, true) + campo('B', 'Perna', pc.B, true) + campo('p', 'Largura', pc.p, true) + campo('qtd', 'Qtd.', pc.qtd, true) + '</div>' + chips('perna', pc.perna, [['esq', '⌙ Perna à esquerda'], ['dir', '⌐ Perna à direita']]);
      else h += '<div class="des-g">' + campo('A', 'Comprimento', pc.A, true) + campo('p', 'Largura', pc.p, true) + campo('qtd', 'Qtd.', pc.qtd, true) + '</div>';
      h += '<span class="des-l" style="margin-top:10px">Acabamento</span>' + chips('saia', pc.saia, SAIAS);
      if (pc.saia === 'slim') h += '<div class="des-dica">Slim: só a espessura da pedra (2 cm), sem sainha.</div>';
      else if (pc.saia !== 'nenhuma') h += '<div class="des-g" style="grid-template-columns:1fr 2fr">' + campo('saiaAlt', 'Altura da sainha', pc.saiaAlt, true) + '<div class="des-dica" style="align-self:end">' + (pc.saia === '45' ? 'Padrão da 45°: 6 cm' : 'Pode mudar a altura') + '</div></div>';
      if (pc.tipo !== 'prateleira') {
        var c = pc.cuba || {}, tem = c.tipo && c.tipo !== 'nenhuma';
        h += '<span class="des-l" style="margin-top:10px">Detalhes</span><div class="des-ch">' + '<button type="button" data-cubaon="1" class="' + (tem ? 'on' : '') + '">' + (tem ? '✓ ' : '') + 'Cuba</button>' + lig('reb.on', pc.reb && pc.reb.on, 'Rebaixo') + lig('cook.on', pc.cook && pc.cook.on, 'Cooktop') + '</div>';
        if (tem) {
          h += chips('cuba.tipo', c.tipo, CUBAS.slice(1));
          if (!/esculp|rampada/.test(c.tipo)) h += chips('cuba.inst', c.inst, [['embutida', 'Embutida'], ['sobrepor', 'De sobrepor'], ['flush', 'Flush']]);
        }
        h += rebHtml(pc);
        h += '<span class="des-l" style="margin-top:10px">Frontão</span><div class="des-ch">' + lig('frF', pc.frF, 'Fundo') + lig('frE', pc.frE, 'Esquerdo') + lig('frD', pc.frD, 'Direito') + '</div>';
        if (pc.frF || pc.frE || pc.frD) h += '<div class="des-g" style="grid-template-columns:1fr 2fr">' + campo('fr', 'Altura do frontão', pc.fr, true) + '<div></div></div>';
        h += '<span class="des-l" style="margin-top:10px">Pé estrutural</span>' + chips('pe', pc.pe, [['nenhum', 'Sem pé'], ['esq', 'Esquerdo'], ['dir', 'Direito']]);
        if ((pc.cuba && pc.cuba.tipo !== 'nenhuma') || (pc.reb && pc.reb.on) || (pc.cook && pc.cook.on)) h += '<div class="des-dica">👆 <b>Arraste</b> a cuba, o rebaixo e o cooktop no desenho (bolinha ⇔). Toque num <b>número</b> para mudar a medida.</div>';
        else h += '<div class="des-dica">👆 Toque num <b>número</b> do desenho para mudar a medida.</div>';
      } else h += '<div class="des-dica">👆 Toque num <b>número</b> do desenho para mudar a medida.</div>';
    } else {
      h += '<div class="des-g">' + campo('A', 'Largura', pc.A, true) + campo('H', 'Altura', pc.H, true) + (pc.tipo === 'nicho' ? campo('prof', 'Profund.', pc.prof, true) : campo('qtd', 'Qtd.', pc.qtd, true)) + '</div>';
    }
    h += avisos(pc).map(function (a) { return '<div class="des-av">⚠️ ' + esc(a) + '</div>'; }).join('');
    return h + '</div>';
  }
  function rebHtml(pc) {
    var rb = pc.reb || {}; if (!rb.on) return '';
    var nrm = rb.tipo === 'normal', h = '<span class="des-l" style="margin-top:10px">Rebaixo</span>' + chips('reb.tipo', nrm ? 'normal' : 'americano', [['americano', 'Americano'], ['normal', 'Normal (cortado até a sainha)']]);
    h += '<div class="des-g">' + campo('reb.c', 'Comprimento', rb.c, true) + (nrm ? '' : campo('reb.l', 'Largura', rb.l, true)) + campo('reb.x', 'Início a (do canto esq.)', rb.x, true, 'pela cuba') + '</div>';
    return h + '<div class="des-dica">' + (nrm ? 'Normal: igual ao americano, mas cortado até a sainha: 3 pedras (tampo, rebaixo 2 cm mais baixo e tampo), ou 2 se encostar numa lateral. O frontão divide na área molhada e lá tem 2 cm a mais.' : 'Americano: a pedra continua inteira e o rebaixo fica embutido nela.') + '</div>';
  }
  function painel() {
    var d = st.d, ps = d.pecas || [], h = '<div id="desCvSlot"></div>';
    if (st.sel >= ps.length) st.sel = ps.length - 1; if (st.sel < 0 && ps.length) st.sel = 0;
    if (!ps.length) h += '<div class="des-sec"><h4>🧩 Escolha um módulo</h4>' + modsHtml(true) + '<div class="des-dica">Depois é só tocar no desenho: arrastar a cuba, o rebaixo e o cooktop, e tocar nos números para mudar as medidas.</div></div>';
    else {
      h += barraPeca(ps[st.sel], st.sel);
      h += '<div class="des-sec"><h4>＋ Adicionar módulo</h4>' + modsHtml(false) + '</div>';
    }
    h += '<div class="des-sec"><div class="des-g2" style="margin-top:0">' + campo('cliente', 'Cliente', d.cliente) + campo('material', 'Material', d.material, false, 'ex.: preto São Gabriel') + '</div></div>';
    h += '<button class="des-bt des-bt2" data-acao="esc" style="margin:0 0 10px">' + (st.esc ? '▾ Esconder' : '✍️ Prefere escrever ou ditar o projeto?') + '</button>';
    if (st.esc) h += '<div class="des-sec"><h4>✍️ Escreva o projeto</h4><textarea class="des-ta des-txt" data-f="texto" placeholder="Escreva como você fala. Ex.:\nCozinha em L 250 x 100, perna esquerda, sainha 45, frontão 10, rebaixo americano 120x48, cuba a 155 do canto esquerdo">' + esc(d.texto || '') + '</textarea>'
      + '<div class="des-dica">🎤 Pode ditar pelo microfone do teclado. Uma peça por linha. (Escrever troca as peças do desenho.)</div><div id="desEnt">' + entendiHtml() + '</div>'
      + '<details class="des-ex"><summary>Ver exemplos</summary>' + EXEMPLOS.map(function (x, i) { return '<div class="des-exi" data-ex="' + i + '">' + esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</details></div>';
    h += '<button class="des-bt des-bt2" data-acao="det" style="margin:0 0 10px">' + (st.det ? '▾ Esconder' : '⚙️ Todas as opções e lista de corte') + '</button>';
    if (!st.det) return h;
    h += '<div class="des-sec"><span class="des-l">Descrição na folha (vazio = escrevo sozinho)</span><textarea class="des-ta" data-f="desc" placeholder="' + esc(descAuto(d)) + '">' + esc(d.desc || '') + '</textarea></div>';
    h += ps.map(painelPeca).join('');
    h += '<div class="des-sec"><h4>Observações gerais</h4><textarea class="des-ta" data-f="obs" placeholder="Uma por linha. Ex.: Área molhada 130x48">' + esc(d.obs || '') + '</textarea></div>';
    var pcs = []; ps.forEach(function (pc) { corte(pc).forEach(function (x) { x.de = nomePeca(pc); pcs.push(x); }); });
    h += '<div class="des-sec"><h4>Lista de peças para o corte</h4>' + (pcs.length ? pcs.map(function (p) { return '<div class="des-pc"><span>' + (p.qtd > 1 ? p.qtd + '× ' : '') + esc(p.nome) + (ps.length > 1 && p.nome.indexOf(p.de) < 0 ? ' <span class="des-sub">(' + esc(p.de) + ')</span>' : '') + '</span><b>' + f1(p.c) + ' × ' + f1(p.l) + '</b></div>'; }).join('') : '<div class="des-dica">Sem peças.</div>') + '</div>';
    h += '<button class="des-bt des-bt2" data-acao="apagar" style="background:transparent;border:1px solid rgba(239,68,68,.35);color:#f87171">Apagar este desenho</button>';
    return h;
  }
  // ── no próprio desenho: arrastar recortes e tocar nas medidas ──
  var NDIM = { A: 'Comprimento', p: 'Largura', B: 'Perna do L (sem a largura da pia)', pB: 'Largura da perna', H: 'Altura', prof: 'Profundidade', fr: 'Altura do frontão' };
  function pedirNum(rot, v, cb) {
    var o = document.createElement('div'); o.className = 'des-num';
    o.innerHTML = '<div class="cx"><div class="t">' + esc(rot) + ' (cm)</div><input type="text" inputmode="decimal" value="' + esc(v) + '"><div class="b"><button type="button" data-n="0">Cancelar</button><button type="button" data-n="1" class="ok">OK</button></div></div>';
    document.body.appendChild(o);
    var inp = o.querySelector('input'), fim = function (ok) { var x = num(inp.value, NaN); o.remove(); if (ok && isFinite(x) && x > 0) cb(Math.round(x * 10) / 10); };
    setTimeout(function () { inp.focus(); inp.select(); }, 30);
    o.addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) fim(b.getAttribute('data-n') === '1'); else if (e.target === o) fim(false); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') fim(true); if (e.key === 'Escape') fim(false); });
  }
  function tocarDim(key) {
    var pr = key.split('|'), i = +pr[0], k = pr[1], pc = st.d.pecas[i]; if (!pc) return;
    var rot = (pc.tipo === 'L' && k === 'A' ? 'Comprimento do fundo' : pc.tipo === 'nicho' && k === 'A' ? 'Largura' : NDIM[k] || k) + ' — ' + nomePeca(pc);
    st.sel = i;
    if (/^(rx0|rx1|rebc)$/.test(k)) { // medidas da área molhada
      var g = geo(pc), rb = recortes(pc, g).filter(function (r) { return r.t === 'reb'; })[0]; if (!rb) return;
      var at = k === 'rx0' ? rb.x0 : k === 'rebc' ? rb.x1 - rb.x0 : g.A - rb.x1;
      pedirNum(k === 'rx0' ? 'Da esquerda até o rebaixo' : k === 'rebc' ? 'Comprimento do rebaixo (área molhada)' : 'Do rebaixo até a direita', Math.round(at * 10) / 10, function (v) {
        if (k === 'rx0') pc.reb.x = v; else if (k === 'rebc') { pc.reb.c = v; pc.reb.x = rb.x0; } else pc.reb.x = Math.max(0, g.A - v - (rb.x1 - rb.x0));
        var c = pc.cuba || {}, cb = recortes(pc, g).filter(function (r) { return r.t === 'cuba'; })[0]; if (cb && cb.cx > rb.x0 && cb.cx < rb.x1) c.x = ''; // a cuba acompanha o rebaixo desenharCv(); atualizarPainel();
      });
      return;
    }
    pedirNum(rot, num(pc[k]), function (v) { pc[k] = v; desenharCv(); atualizarPainel(); });
  }
  var arr = null, arrRaf = 0;
  function dicaArr(t) { var d = document.getElementById('desTip'); if (!d) return; d.textContent = t || ''; d.style.display = t ? 'block' : 'none'; }
  function moverRecorte(a, dx) {
    var pc = st.d.pecas[a.i], g = geo(pc), m = g.main, c = pc.cuba || {}, cl = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }, v = a.ini + dx, t;
    if (a.t === 'cuba') { var w2 = num(c.w, 40) / 2; v = Math.round(cl(v, m.x0 + 3 + w2, m.x1 - 3 - w2)); c.ref = 'esq'; c.x = v; t = 'Cuba: centro a ' + f1(v) + ' cm do canto esquerdo'; }
    else if (a.t === 'reb') { var rc = Math.max(10, num(pc.reb.c, 120)), mg = rebNormal(pc) ? 0 : 3; v = Math.round(cl(v, m.x0 + mg, m.x1 - mg - rc)); if (mg === 0) { if (v - m.x0 < 3) v = m.x0; if (m.x1 - v - rc < 3) v = m.x1 - rc; } pc.reb.x = v; if (a.cIni != null) { c.ref = 'esq'; c.x = Math.round(a.cIni + (v - a.ini)); } t = 'Rebaixo: começa a ' + f1(v) + ' cm do canto esquerdo'; }
    else { var k2 = Math.max(10, num(pc.cook.w, 56)) / 2; v = Math.round(cl(v, m.x0 + 3 + k2, m.x1 - 3 - k2)); pc.cook.x = v; t = 'Cooktop: centro a ' + f1(v) + ' cm do canto esquerdo'; }
    return t;
  }
  function ligarDesenho(cv) {
    if (cv.__lig) return; cv.__lig = 1;
    cv.addEventListener('touchstart', function (e) { if (e.target.closest && e.target.closest('[data-rc]')) e.preventDefault(); }, { passive: false });
    cv.addEventListener('pointerdown', function (e) {
      var hit = e.target.closest('[data-rc]'); if (!hit) return;
      var pr = hit.getAttribute('data-rc').split('|'), i = +pr[0], t = pr[1], pc = st.d.pecas[i], sv = cv.querySelector('svg'), L = st.lay[i]; if (!pc || !sv || !L) return;
      var R = recortes(pc, geo(pc)), r = R.filter(function (x) { return x.t === t; })[0], cb = R.filter(function (x) { return x.t === 'cuba'; })[0]; if (!r) return;
      e.preventDefault();
      arr = { i: i, t: t, id: e.pointerId, x0: e.clientX, k: sv.getBoundingClientRect().width / FW, s: L.s, ini: t === 'reb' ? r.x0 : r.cx, mov: false, cIni: t === 'reb' && cb && !vazio((pc.cuba || {}).x) && cb.x0 >= r.x0 - 1 && cb.x1 <= r.x1 + 1 ? cb.cx : null };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    });
    cv.addEventListener('pointermove', function (e) {
      if (!arr || e.pointerId !== arr.id) return; var dpx = e.clientX - arr.x0;
      if (!arr.mov && Math.abs(dpx) < 5) return; arr.mov = true; e.preventDefault();
      var tx = moverRecorte(arr, dpx / (arr.k * arr.s));
      if (!arrRaf) arrRaf = requestAnimationFrame(function () { arrRaf = 0; desenharCv(); dicaArr(arr ? tx : ''); });
    });
    var solta = function (e) {
      if (!arr || e.pointerId !== arr.id) return; var a = arr; arr = null;
      if (!a.mov) { st.sel = a.i; desenharCv(); atualizarPainel(); dicaArr(a.t === 'cuba' ? 'Arraste para os lados para mudar a cuba de lugar' : a.t === 'reb' ? 'Arraste para os lados para mudar o rebaixo de lugar' : 'Arraste para os lados para mudar o cooktop de lugar'); }
      else { if (st.sel !== a.i) st.sel = a.i; desenharCv(); atualizarPainel(); var tp = document.getElementById('desTip'); dicaArr(tp && tp.textContent); }
      clearTimeout(st.tmTip); st.tmTip = setTimeout(function () { dicaArr(''); }, 1800);
    };
    cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta);
  }
  function telaEditor() {
    var m = document.getElementById('desMain'); if (!m) return;
    m.innerHTML = '<div class="des-cv" id="desCv"></div><div class="des-pn" id="desPn">' + painel() + '</div>';
    var bar = document.getElementById('desBar'); if (bar) bar.style.display = 'flex';
    encaixarCv(); desenharCv();
  }
  function encaixarCv() { var cv = document.getElementById('desCv'), sl = document.getElementById('desCvSlot'), m = document.getElementById('desMain'); if (!cv) return; if (innerWidth < 900 && sl) { if (cv.parentNode !== sl) { sl.appendChild(cv); cv.style.marginBottom = '10px'; } } else if (m && cv.parentNode !== m) m.insertBefore(cv, m.firstChild); }
  function desenharCv() {
    var cv = document.getElementById('desCv'); if (!cv) return; var tp = document.getElementById('desTip'), tt = tp && tp.style.display === 'block' ? tp.textContent : '';
    INTER = true; st.lay = {}; var sv; try { sv = folhaSvg(st.d); } finally { INTER = false; }
    cv.innerHTML = sv + '<button type="button" class="lupa" data-acao="zoom">🔍 Ampliar</button><div class="des-tip" id="desTip"' + (tt ? ' style="display:block"' : '') + '>' + esc(tt) + '</div>';
    ligarDesenho(cv);
  }
  function atualizarPainel() {
    var pn = document.getElementById('desPn'); if (!pn) return; var y = document.getElementById('desMain').scrollTop, ae = document.activeElement, foco = ae && ae.getAttribute('data-f'), pci = ae && ae.closest('[data-pc]');
    var cv = document.getElementById('desCv'); if (cv && pn.contains(cv)) document.getElementById('desMain').appendChild(cv);
    pn.innerHTML = painel(); encaixarCv(); document.getElementById('desMain').scrollTop = y;
    if (foco) { var sel = pci ? pn.querySelector('[data-pc="' + pci.getAttribute('data-pc') + '"] [data-f="' + foco + '"]') : pn.querySelector(':scope > .des-sec [data-f="' + foco + '"]'); if (sel) { sel.focus(); try { var v = sel.value; sel.setSelectionRange(v.length, v.length); } catch (e) {} } }
  }
  function telaLista() {
    var m = document.getElementById('desMain'); if (!m) return; var l = lista(), bar = document.getElementById('desBar'); if (bar) bar.style.display = 'none';
    m.innerHTML = '<div style="flex:1 1 100%;max-width:720px;margin:0 auto"><button class="des-bt" data-acao="novo">＋ Novo projeto</button><button class="des-bt des-bt2" data-acao="ped">🏭 Puxar de um pedido</button><button class="des-bt des-bt2" data-acao="orc">📋 Puxar de um orçamento</button><div style="height:10px"></div>' + (l.length ? l.map(function (d) { return '<div class="des-li" data-abre="' + esc(d.id) + '"><span style="font-size:1.4rem">📐</span><div style="flex:1"><b>' + esc(d.cliente || 'Sem cliente') + '</b><div class="des-sub">' + esc(vazio(d.desc) ? descAuto(d) : d.desc) + (d.material ? ' · ' + esc(d.material) : '') + ' · ' + new Date(d.em).toLocaleDateString('pt-BR') + '</div></div><span style="color:#c9a84c">›</span></div>'; }).join('') : '<div class="des-dica" style="text-align:center;padding:30px">Nenhum projeto ainda. Toque em <b>Novo projeto</b>.</div>') + '</div>';
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
    el.addEventListener('input', function (e) { var t = e.target.closest('[data-f]'); if (!t || st.tela !== 'editor') return; lerCampo(t); if (t.getAttribute('data-f') === 'texto' && !pcDe(t)) { var np = interpretar(t.value); if (np.length || !t.value.trim()) st.d.pecas = np; var en = document.getElementById('desEnt'); if (en) en.innerHTML = entendiHtml(); desenharCv(); return; } desenharCv(); clearTimeout(st.tm); st.tm = setTimeout(function () { var pc = pcDe(t), sel = t.closest('.des-selpc'); if (pc && sel) { sel.querySelectorAll('.des-av').forEach(function (x) { x.remove(); }); avisos(pc).forEach(function (x) { var dv = document.createElement('div'); dv.className = 'des-av'; dv.textContent = '⚠️ ' + x; sel.appendChild(dv); }); var tb = sel.querySelector('.des-tabs .on'); if (tb) tb.textContent = (st.d.pecas.indexOf(pc) + 1) + '. ' + nomePeca(pc); return; } if (pc) { var hd = document.querySelector('[data-pc="' + st.d.pecas.indexOf(pc) + '"] .des-pc-h[data-abrepc]'); if (hd) { var tmp = document.createElement('div'); tmp.innerHTML = painelPeca(pc, st.d.pecas.indexOf(pc)); var nh = tmp.querySelector('.des-pc-h'); hd.innerHTML = nh.innerHTML; var sec = hd.parentNode; sec.querySelectorAll('.des-av').forEach(function (a) { a.remove(); }); var rb2 = sec.querySelector('[data-dup]'); if (!rb2) return; var ref = rb2.parentNode; tmp.querySelectorAll('.des-av').forEach(function (a) { sec.insertBefore(a, ref); }); } } }, 500); });
    el.addEventListener('click', function (e) {
      var d = st.d, a = e.target.closest('[data-acao]'), ch = e.target.closest('[data-ch]'), tg = e.target.closest('[data-tg]'), ad = e.target.closest('[data-addpc]'), rm = e.target.closest('[data-rmpc]'), dp = e.target.closest('[data-dup]'), ap = e.target.closest('[data-abrepc]'), ab = e.target.closest('[data-abre]');
      var md = e.target.closest('[data-mod]'); if (md) { d.pecas.push(MODS[+md.getAttribute('data-mod')].f()); st.sel = d.pecas.length - 1; desenharCv(); atualizarPainel(); var cvv = document.getElementById('desCv'); if (cvv && innerWidth < 900) cvv.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var sp = e.target.closest('[data-selpc]'); if (sp) { st.sel = +sp.getAttribute('data-selpc'); desenharCv(); atualizarPainel(); return; }
      var dm = e.target.closest('[data-dim]'); if (dm) { tocarDim(dm.getAttribute('data-dim')); return; }
      var co = e.target.closest('[data-cubaon]'); if (co) { var pcc = pcDe(co), cc = pcc.cuba = pcc.cuba || {}; if (cc.tipo && cc.tipo !== 'nenhuma') cc.tipo = 'nenhuma'; else { cc.inst = cc.inst || 'embutida'; cc.ref = cc.ref || 'esq'; if (pcc.tipo === 'lavatorio') { cc.tipo = 'redonda'; cc.w = 40; cc.h = 40; } else { cc.tipo = 'retangular'; cc.w = 56; cc.h = 34; } } desenharCv(); atualizarPainel(); return; }
      var pcs1 = e.target.closest('[data-pcsel]'); if (pcs1 && !e.target.closest('[data-acao]')) { var ni = +pcs1.getAttribute('data-pcsel'); if (ni !== st.sel) { st.sel = ni; desenharCv(); atualizarPainel(); } return; }
      if (ch) { var pc = pcDe(ch), k = ch.getAttribute('data-ch'), vv = ch.getAttribute('data-v'); if (k === 'vista') vv = +vv; setK(pc, k, vv); if (k === 'saia') { var sa0 = num(pc.saiaAlt); if (vv === '45' && (sa0 === 4 || !sa0)) pc.saiaAlt = 6; else if ((vv === 'reta' || vv === 'boleada') && (sa0 === 6 || !sa0)) pc.saiaAlt = pc.tipo === 'lavatorio' ? 10 : 4; } if (k === 'cuba.tipo') { var cb = pc.cuba; if (vv === 'redonda') { cb.w = pc.tipo === 'lavatorio' ? 40 : 45; cb.h = cb.w; } else if (vv === 'oval') { cb.w = 48; cb.h = 36; } else if (/esculp|rampada/.test(vv)) { cb.w = 50; cb.h = 35; } else if (vv === 'retangular') { cb.w = pc.tipo === 'lavatorio' ? 45 : 56; cb.h = pc.tipo === 'lavatorio' ? 30 : 34; } } desenharCv(); atualizarPainel(); return; }
      if (tg) { var pc2 = pcDe(tg), k2 = tg.getAttribute('data-tg'); setK(pc2, k2, !getK(pc2, k2)); desenharCv(); atualizarPainel(); return; }
      if (ad) { d.pecas.push(novaPeca(ad.getAttribute('data-addpc'))); st.aberta = d.pecas.length - 1; st.sel = st.aberta; desenharCv(); atualizarPainel(); var u = document.querySelector('[data-pc="' + st.aberta + '"]'); if (u) u.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (rm) { if (!confirm('Remover esta peça?')) return; d.pecas.splice(+rm.getAttribute('data-rmpc'), 1); st.aberta = -1; desenharCv(); atualizarPainel(); return; }
      if (dp) { var cp = JSON.parse(JSON.stringify(d.pecas[+dp.getAttribute('data-dup')])); cp.id = uid(); d.pecas.splice(+dp.getAttribute('data-dup') + 1, 0, cp); st.aberta = +dp.getAttribute('data-dup') + 1; desenharCv(); atualizarPainel(); return; }
      if (ap) { var i = +ap.getAttribute('data-abrepc'); st.aberta = st.aberta === i ? -1 : i; atualizarPainel(); return; }
      if (ab) { var x = lista().filter(function (y) { return y.id === ab.getAttribute('data-abre'); })[0]; if (x) { st.d = x; st.aberta = 0; st.sel = 0; st.det = false; st.esc = false; st.tela = 'editor'; render(); } return; }
      var px = e.target.closest('[data-pedx]'); if (px && st.peds) { var pd = st.peds[+px.getAttribute('data-pedx')]; st.d = novo(); st.d.cliente = pd.nome || ''; st.d.material = pd.pedra || ''; st.d.pid = pd.id; st.d.pecas = pecasDoPedido(pd); st.aberta = -1; st.sel = 0; st.det = false; st.esc = false; st.tela = 'editor'; render(); aviso(st.d.pecas.length ? '🏭 Puxei do pedido. Confira a posição da cuba.' : '⚠️ Esse pedido não tem as medidas das peças.'); return; }
      var oc = e.target.closest('[data-orc]'); if (oc && st.orcs) { var q = st.orcs[+oc.getAttribute('data-orc')]; st.d = novo(); st.d.cliente = q.cli || ''; st.d.material = q.mat || ''; st.d.texto = textoDoOrcamento(q); st.d.pecas = interpretar(st.d.texto); st.aberta = -1; st.sel = 0; st.det = false; st.esc = false; st.tela = 'editor'; render(); aviso('📋 Puxei do orçamento. Confira as medidas e a posição da cuba.'); return; }
      var ex = e.target.closest('[data-ex]'); if (ex) { d.texto = EXEMPLOS[+ex.getAttribute('data-ex')]; d.pecas = interpretar(d.texto); st.aberta = -1; desenharCv(); atualizarPainel(); return; }
      if (!a) return; var k3 = a.getAttribute('data-acao');
      if (k3 === 'det') { st.det = !st.det; atualizarPainel(); return; }
      if (k3 === 'esc') { st.esc = !st.esc; atualizarPainel(); return; }
      if (k3 === 'zoom') { zoom(); return; }
      if (k3 === 'voltar') { if (st.tela === 'editor') { guardar(st.d); st.tela = 'lista'; render(); } else el.remove(); return; }
      if (k3 === 'orc') { var os = orcamentos(); document.getElementById('desMain').innerHTML = '<div style="flex:1 1 100%;max-width:720px;margin:0 auto"><button class="des-bt des-bt2" data-acao="voltarLista">← Voltar</button><div class="des-dica" style="margin:10px 0">Escolha o orçamento: o desenho sai com as medidas, a cuba, a sainha e o rebaixo dele.</div>' + (os.length ? os.map(function (q, i) { return '<div class="des-li" data-orc="' + i + '"><span style="font-size:1.4rem">📋</span><div style="flex:1"><b>' + esc(q.cli || 'Sem cliente') + '</b><div class="des-sub">' + esc((q.ambSnap || []).map(function (a) { return a.tipo; }).join(' + ')) + (q.mat ? ' · ' + esc(q.mat) : '') + (q.date || q.data ? ' · ' + esc(String(q.date || q.data).slice(0, 10)) : '') + '</div></div><span style="color:#c9a84c">›</span></div>'; }).join('') : '<div class="des-dica">Nenhum orçamento salvo no app ainda.</div>') + '</div>'; st.orcs = os; return; }
      if (k3 === 'voltarLista') { render(); return; }
      if (k3 === 'ped') { var mn = document.getElementById('desMain'); mn.innerHTML = '<div class="des-dica" style="padding:30px;text-align:center">Carregando os pedidos…</div>';
        api('/bot/producao').then(function (pr) { st.peds = pr.pedidos || []; mn.innerHTML = '<div style="flex:1 1 100%;max-width:720px;margin:0 auto"><button class="des-bt des-bt2" data-acao="voltarLista">← Voltar</button><div class="des-dica" style="margin:10px 0">Escolha o pedido: o desenho sai com o ambiente, as medidas, a sainha, o frontão e a cuba (de sobrepor ou de embutir) dele.</div>' + (st.peds.length ? st.peds.map(function (p, i) { return '<div class="des-li" data-pedx="' + i + '"><span style="font-size:1.4rem">🏭</span><div style="flex:1"><b>' + esc(p.nome) + '</b><div class="des-sub">' + esc((p.itens || []).map(function (x) { return x.ambiente; }).join(' + ')) + (p.pedra ? ' · ' + esc(p.pedra) : '') + '</div></div><span style="color:#c9a84c">›</span></div>'; }).join('') : '<div class="des-dica">Nenhum pedido em produção.</div>') + '</div>'; }).catch(function (er) { aviso('⚠️ ' + er.message); render(); }); return; }
      if (k3 === 'novo') { st.d = novo(); st.aberta = 0; st.sel = 0; st.det = false; st.esc = false; st.tela = 'editor'; render(); return; }
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
  window.abrirDesenho = abrir; window.__hrDesTeste = { pecasDoPedido: pecasDoPedido, MODS: MODS, miniSvg: miniSvg, folhaSvg: folhaSvg, novo: novo, novaPeca: novaPeca, corte: corte, itemProducao: itemProducao, notas: notas, descAuto: descAuto, interpretar: interpretar, textoDoOrcamento: textoDoOrcamento, entendi: entendi, avisos: avisos, migrar: migrar, st: st };
})();
