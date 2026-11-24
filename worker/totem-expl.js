// ═══ EXPLICAÇÕES (v314): cada assunto tem várias telas — o que é (3D), para que serve (animação), como fazemos, fotos reais ═══
// Desenhos em SVG feitos à mão: vista 3D isométrica (iso) e cortes laterais. Animações em SMIL (rodam na TV sem script).
var DEFS = '<defs>' +
  '<pattern id="gr" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d3cdc2"/><circle cx="3" cy="4" r="1.4" fill="#8d877d"/><circle cx="11" cy="9" r="1.1" fill="#6f6a62"/><circle cx="7" cy="13" r=".9" fill="#a8a196"/><circle cx="14" cy="2" r=".8" fill="#9a9488"/></pattern>' +
  '<pattern id="gr2" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#aaa498"/><circle cx="3" cy="4" r="1.4" fill="#6f6a62"/><circle cx="11" cy="9" r="1.1" fill="#57534c"/><circle cx="7" cy="13" r=".9" fill="#8a8479"/></pattern>' +
  '<pattern id="gr3" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#8c867b"/><circle cx="3" cy="4" r="1.4" fill="#5c5850"/><circle cx="11" cy="9" r="1.1" fill="#4a4741"/><circle cx="7" cy="13" r=".9" fill="#716b62"/></pattern>' +
  '<linearGradient id="pd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c3b8"/><stop offset="1" stop-color="#8a857c"/></linearGradient>' +
  '<linearGradient id="pe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3b43"/><stop offset="1" stop-color="#26262c"/></linearGradient>' +
  '<linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f4f6"/><stop offset="1" stop-color="#9eabb6"/></linearGradient>' +
  '<linearGradient id="fu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1f24"/><stop offset="1" stop-color="#4b5660"/></linearGradient>' +
  '<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ecd27c"/></marker>' +
  '<marker id="aa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6fb7ff"/></marker></defs>';
var TINTA = '#2b2824', OURO = '#ecd27c', CLARO = '#f3ecdb', CINZA = '#a99c80', AZUL = '#6fb7ff', VERDE = '#5fd38a', VERM = '#ff8a7a';
function SV(b, vb) { return '<svg viewBox="' + (vb || '0 0 800 500') + '" xmlns="http://www.w3.org/2000/svg" font-family="Outfit,Arial,sans-serif">' + DEFS + b + '</svg>'; }
function T(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || OURO) + '" font-size="' + (o.s || 22) + '" text-anchor="' + (o.a || 'start') + '" font-weight="' + (o.w || 500) + '">' + t + '</text>'; }
function L(x1, y1, x2, y2, o) { o = o || {}; var m = 'url(#' + (o.m || 'ar') + ')'; return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (o.c || OURO) + '" stroke-width="' + (o.w || 2) + '"' + (o.d ? ' stroke-dasharray="' + o.d + '"' : '') + (o.n ? '' : ' marker-end="' + m + '"') + (o.dupla ? ' marker-start="' + m + '"' : '') + '/>'; }
function P(d, f, s, w) { return '<path d="' + d + '" fill="' + (f || 'url(#pd)') + '" stroke="' + (s || TINTA) + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round"/>'; }
function RC(x, y, w, h, f, r) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '" fill="' + (f || 'url(#pd)') + '" stroke="' + TINTA + '" stroke-width="2"/>'; }
function GOTA(x, y, s, c) { s = s || 1; return '<path d="M' + x + ' ' + y + 'c' + (-7 * s) + ' ' + (10 * s) + ' ' + (-9 * s) + ' ' + (14 * s) + ' ' + (-9 * s) + ' ' + (18 * s) + 'a' + (9 * s) + ' ' + (9 * s) + ' 0 0 0 ' + (18 * s) + ' 0c0 ' + (-4 * s) + ' ' + (-2 * s) + ' ' + (-8 * s) + ' ' + (-9 * s) + ' ' + (-18 * s) + 'z" fill="' + (c || AZUL) + '"/>'; }
// número dourado (o mesmo número aparece na lista de tópicos da TV)
function NUM(n, x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="17" fill="' + OURO + '" stroke="#1a1408" stroke-width="2"/>' + T(x, y + 7, n, { a: 'middle', s: 20, w: 700, c: '#1a1408' }); }
function PILULA(x, y, txt, s) { s = s || 21; var w = Math.round(txt.length * s * 0.56) + 22; return '<rect x="' + (x - 10) + '" y="' + (y - s - 2) + '" width="' + w + '" height="' + (s + 14) + '" rx="' + ((s + 14) / 2) + '" fill="rgba(10,10,12,.82)" stroke="rgba(236,210,124,.35)"/>'; }
function ETQ(n, x, y, txt, cor) { return PILULA(x + 22, y + 8, txt) + NUM(n, x, y) + T(x + 24, y + 8, txt, { s: 21, c: cor || CLARO, w: 600 }); }
function SETA(x1, y1, x2, y2) { return L(x1, y1, x2, y2, { w: 2.5 }); }
// gota que corre por um caminho (animação)
function CORRE(path, dur, atraso, r) { return '<circle r="' + (r || 7) + '" fill="' + AZUL + '" opacity="0"><animateMotion path="' + path + '" dur="' + dur + 's" begin="' + (atraso || 0) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="' + dur + 's" begin="' + (atraso || 0) + 's" repeatCount="indefinite"/></circle>'; }
function PISCA(conteudo, dur) { return '<g>' + conteudo + '<animate attributeName="opacity" values="1;.35;1" dur="' + (dur || 1.6) + 's" repeatCount="indefinite"/></g>'; }
function SOBE(conteudo, dy, dur) { return '<g>' + conteudo + '<animateTransform attributeName="transform" type="translate" values="0 ' + dy + ';0 ' + dy + ';0 0;0 0" keyTimes="0;.25;.6;1" dur="' + (dur || 4) + 's" repeatCount="indefinite"/></g>'; }
function JUNTA(conteudo, dx, dy, dur) { return '<g>' + conteudo + '<animateTransform attributeName="transform" type="translate" values="' + dx + ' ' + dy + ';' + dx + ' ' + dy + ';0 0;0 0" keyTimes="0;.2;.55;1" dur="' + (dur || 4) + 's" repeatCount="indefinite"/></g>'; }
function PAREDE(x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#pe)"/>'; }
function NOTA(x, y, linhas, o) { o = o || {}; var s = ''; linhas.forEach(function (l, i) { s += T(x, y + i * (o.lh || 28), l, o); }); return s; }
function SELO(x, y, txt, cor) { var w = txt.length * 11 + 34; return '<rect x="' + (x - w / 2) + '" y="' + (y - 24) + '" width="' + w + '" height="38" rx="19" fill="' + cor + '" opacity=".18"/><rect x="' + (x - w / 2) + '" y="' + (y - 24) + '" width="' + w + '" height="38" rx="19" fill="none" stroke="' + cor + '" stroke-width="2"/>' + T(x, y + 2, txt, { a: 'middle', s: 20, w: 700, c: cor }); }

// ── vista 3D isométrica ──
var ISO = { x: 400, y: 120, s: 2.4 };
function ip(x, y, z) { return [+(ISO.x + (x - y) * 0.866 * ISO.s).toFixed(1), +(ISO.y + (x + y) * 0.5 * ISO.s - z * ISO.s).toFixed(1)]; }
function pts(l) { return l.map(function (p) { return ip(p[0], p[1], p[2]).join(','); }).join(' '); }
function POLI(l, f, s, w) { return '<polygon points="' + pts(l) + '" fill="' + f + '" stroke="' + (s || TINTA) + '" stroke-width="' + (w || 1.5) + '" stroke-linejoin="round"/>'; }
function CAMINHO(aneis, f) { return '<path fill-rule="evenodd" d="' + aneis.map(function (r) { return 'M' + r.map(function (p) { return ip(p[0], p[1], p[2]).join(' '); }).join(' L') + ' Z'; }).join(' ') + '" fill="' + f + '" stroke="' + TINTA + '" stroke-width="1.5" stroke-linejoin="round"/>'; }
var PEDRA = { t: 'url(#gr)', l: 'url(#gr2)', r: 'url(#gr3)' };
function CAIXA(x, y, z, w, d, h, c) {
  c = c || PEDRA;
  return POLI([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l) +
    POLI([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r) +
    POLI([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t);
}
function PT(x, y, z) { var p = ip(x, y, z); return { x: p[0], y: p[1] }; }
function ROTULO(n, x, y, z, lx, ly, txt, o) { var p = PT(x, y, z); o = o || {}; return L(lx - 24, ly - 8, p.x, p.y, { w: 2.5 }) + '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="' + OURO + '"/>' + PILULA(lx - 2, ly, txt) + NUM(n, lx - 24, ly - 8) + T(lx, ly, txt, { s: o.s || 21, c: CLARO, w: 600 }); }
function PAREDE3D(x0, x1, z1) { return POLI([[x0, 0, 0], [x1, 0, 0], [x1, 0, z1], [x0, 0, z1]], '#2f2f36', '#2f2f36') + POLI([[x0, 0, 0], [x0, 0, z1], [x0, 70, z1], [x0, 70, 0]], '#25252b', '#25252b'); }
function TORNEIRA(x, y, z) { var b = PT(x, y, z), t = PT(x, y, z + 26), q = PT(x, y + 14, z + 26); return '<path d="M' + b.x + ' ' + b.y + ' L' + t.x + ' ' + t.y + ' Q' + (t.x - 6) + ' ' + (t.y - 16) + ' ' + q.x + ' ' + (q.y) + '" fill="none" stroke="#d9dee2" stroke-width="7" stroke-linecap="round"/><ellipse cx="' + b.x + '" cy="' + b.y + '" rx="9" ry="5" fill="#b9c0c6"/>'; }

// ── peças comuns em corte (vista de lado) ──
function cubaCorte(ox, oy, tipo, esc) {
  esc = esc || 1;
  var s = '', top = oy + 70 * esc, esp = 22 * esc, a = ox + 120 * esc, b = ox + 260 * esc, fundo = oy + 170 * esc, fim = ox + 360 * esc, ini = ox + 20 * esc;
  var bacia = function (y0) { return P('M' + (a + 6 * esc) + ' ' + y0 + ' V' + (fundo - 30 * esc) + ' Q' + (a + 6 * esc) + ' ' + fundo + ' ' + (a + 50 * esc) + ' ' + fundo + ' H' + (b - 50 * esc) + ' Q' + (b - 6 * esc) + ' ' + fundo + ' ' + (b - 6 * esc) + ' ' + (fundo - 30 * esc) + ' V' + y0, 'url(#cb)', '#5b6670'); };
  if (tipo === 'sobrepor') s += RC(ini, top, a - ini + 6 * esc, esp, 'url(#gr)') + RC(b - 6 * esc, top, fim - b + 6 * esc, esp, 'url(#gr)') + bacia(top + esp) + RC(a - 18 * esc, top - 12 * esc, b - a + 36 * esc, 12 * esc, 'url(#cb)', 4);
  else if (tipo === 'embutir') s += bacia(top + esp + 10 * esc) + RC(a - 16 * esc, top + esp, b - a + 32 * esc, 10 * esc, 'url(#cb)', 3) + RC(ini, top, a - ini, esp, 'url(#gr)') + RC(b, top, fim - b, esp, 'url(#gr)');
  else if (tipo === 'flush') s += bacia(top + 10 * esc) + P('M' + ini + ' ' + top + ' H' + (a - 14 * esc) + ' V' + (top + 10 * esc) + ' H' + a + ' V' + (top + esp) + ' H' + ini + ' Z', 'url(#gr)') + P('M' + fim + ' ' + top + ' H' + (b + 14 * esc) + ' V' + (top + 10 * esc) + ' H' + b + ' V' + (top + esp) + ' H' + fim + ' Z', 'url(#gr)') + RC(a - 12 * esc, top, b - a + 24 * esc, 10 * esc, 'url(#cb)', 2);
  else s += P('M' + ini + ' ' + top + ' H' + a + ' L' + (a + 12 * esc) + ' ' + (fundo - 20 * esc) + ' Q' + (ox + 190 * esc) + ' ' + (fundo - 6 * esc) + ' ' + (b - 12 * esc) + ' ' + (fundo - 34 * esc) + ' L' + b + ' ' + top + ' H' + fim + ' V' + (top + esp) + ' H' + (b + 14 * esc) + ' L' + (b + 2 * esc) + ' ' + (fundo - 14 * esc) + ' Q' + (ox + 190 * esc) + ' ' + (fundo + 18 * esc) + ' ' + (a - 2 * esc) + ' ' + (fundo + 4 * esc) + ' L' + (a - 14 * esc) + ' ' + (top + esp) + ' H' + ini + ' Z', 'url(#gr)');
  return s;
}
function NOTAS3(x, y, l) { // três barrinhas de nota: [rótulo, 1 a 5]
  var s = ''; l.forEach(function (r, i) { var yy = y + i * 46; s += T(x, yy, r[0], { s: 20, c: CINZA }); for (var k = 0; k < 5; k++) s += '<rect x="' + (x + 190 + k * 34) + '" y="' + (yy - 17) + '" width="28" height="18" rx="5" fill="' + (k < r[1] ? (r[2] || VERDE) : 'rgba(255,255,255,.12)') + '"/>'; });
  return s;
}

// ═══ a biblioteca ═══
var EXPL = [
 { id: 'rebaixo', tit: 'Rebaixo americano', sub: 'A área da cuba fica mais baixa que a bancada', busca: 'rebaixo',
   telas: [
    { tit: 'O que é o rebaixo americano', sub: 'Uma "bandeja" de pedra em volta da cuba', num: 1,
      pontos: ['Bancada: a pedra no nível normal', 'Rebaixo: a área em volta da cuba fica de 2 a 4 cm mais baixa', 'Cuba: fica embutida por baixo, dentro do rebaixo', 'A torneira fica na parte de trás do rebaixo ou na parede'],
      svg: function () { ISO = { x: 290, y: 46, s: 2.95 }; var s = PAREDE3D(0, 210, 55);
        var x0 = 70, x1 = 150, y0 = 10, y1 = 52, z = 4, dz = 3;
        s += POLI([[0, 60, 0], [210, 60, 0], [210, 60, z], [0, 60, z]], PEDRA.l) + POLI([[210, 0, 0], [210, 60, 0], [210, 60, z], [210, 0, z]], PEDRA.r);
        s += CAMINHO([[[0, 0, z], [210, 0, z], [210, 60, z], [0, 60, z]], [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]], PEDRA.t);
        s += POLI([[x0, y0, z], [x1, y0, z], [x1, y0, z - dz], [x0, y0, z - dz]], PEDRA.l) + POLI([[x0, y0, z], [x0, y1, z], [x0, y1, z - dz], [x0, y0, z - dz]], PEDRA.r);
        s += POLI([[x0, y0, z - dz], [x1, y0, z - dz], [x1, y1, z - dz], [x0, y1, z - dz]], 'url(#gr2)');
        s += POLI([[x0 + 14, y0 + 8, z - dz], [x1 - 14, y0 + 8, z - dz], [x1 - 14, y1 - 6, z - dz], [x0 + 14, y1 - 6, z - dz]], 'url(#fu)', '#5b6670', 2);
        s += TORNEIRA(110, 4, z);
        s += ROTULO(1, 30, 40, z, 60, 380, 'Bancada') + ROTULO(2, 76, 46, z - dz, 80, 470, 'Rebaixo (2 a 4 cm mais baixo)') + ROTULO(3, 130, 38, z - dz, 560, 470, 'Cuba embutida') + ROTULO(4, 110, 4, z + 22, 600, 50, 'Torneira');
        return SV(s); } },
    { tit: 'Para que serve', sub: 'A água fica presa no rebaixo e vai para a cuba', num: 0,
      pontos: ['Sem rebaixo: a água que respinga se espalha pela bancada e escorre para o chão e para o armário', 'Com rebaixo: tudo que respinga cai na "bandeja" e escorre direto para a cuba', 'A bancada em volta fica seca e limpa', 'Fica mais fácil lavar louça grande sem molhar tudo'],
      svg: function () {
        var s = SELO(195, 40, 'SEM REBAIXO', VERM) + SELO(600, 40, 'COM REBAIXO', VERDE) + '<line x1="400" y1="70" x2="400" y2="460" stroke="rgba(255,255,255,.1)" stroke-width="2"/>';
        // sem rebaixo: bancada lisa, cuba de sobrepor; a água espalha e cai no chão
        s += RC(20, 200, 360, 36, 'url(#gr)') + P('M140 236 V300 Q140 345 195 345 Q250 345 250 300 V236', 'url(#cb)', '#5b6670') + RC(124, 186, 142, 14, 'url(#cb)', 5);
        s += '<ellipse cx="70" cy="198" rx="50" ry="6" fill="' + AZUL + '" opacity=".8"><animate attributeName="rx" values="8;52;52" dur="3s" repeatCount="indefinite"/></ellipse>';
        s += CORRE('M80 110 L80 194', 3, 0, 9) + CORRE('M24 198 L18 206 L18 420', 3, .9, 8) + '<ellipse cx="26" cy="428" rx="40" ry="8" fill="' + AZUL + '" opacity=".5"/>' + T(195, 450, 'a água vai para o chão', { a: 'middle', s: 22, c: VERM, w: 600 });
        // com rebaixo: bancada, degrau de 32 px, tampo por baixo e cuba embutida
        s += RC(410, 200, 80, 36, 'url(#gr)') + RC(710, 200, 80, 36, 'url(#gr)') + RC(470, 236, 100, 28, 'url(#gr2)') + RC(630, 236, 100, 28, 'url(#gr2)') + P('M572 264 V318 Q572 352 600 352 Q628 352 628 318 V264', 'url(#cb)', '#5b6670');
        s += '<path d="M490 200 V236 H570 M710 200 V236 H630" fill="none" stroke="' + OURO + '" stroke-width="3" stroke-dasharray="6 5"/>' + L(760, 120, 700, 232) + T(700, 108, 'degrau de 2 a 4 cm', { a: 'middle', s: 19 });
        s += CORRE('M520 110 L520 232 L585 262 L600 330', 2.6, 0, 9) + CORRE('M680 120 L680 232 L615 262 L600 330', 2.6, 1.2, 9) + T(600, 450, 'a água vai para a cuba', { a: 'middle', s: 22, c: VERDE, w: 600 });
        return SV(s); } },
    { tit: 'Como fazemos', sub: 'Recorte, polimento e um tampo colado por baixo', num: 1,
      pontos: ['Recortamos a bancada no tamanho da área do rebaixo', 'Polimos todas as bordas do recorte', 'Colamos um tampo da mesma pedra por baixo, alguns centímetros abaixo', 'Fazemos o furo da cuba no tampo e instalamos a cuba por baixo'],
      svg: function () { ISO = { x: 330, y: 40, s: 2.3 }; var s = '';
        var x0 = 70, x1 = 150, y0 = 10, y1 = 52;
        s += POLI([[0, 60, 30], [210, 60, 30], [210, 60, 34], [0, 60, 34]], PEDRA.l) + POLI([[210, 0, 30], [210, 60, 30], [210, 60, 34], [210, 0, 34]], PEDRA.r) + CAMINHO([[[0, 0, 34], [210, 0, 34], [210, 60, 34], [0, 60, 34]], [[x0, y0, 34], [x1, y0, 34], [x1, y1, 34], [x0, y1, 34]]], PEDRA.t);
        s += PISCA(POLI([[x0, y0, 34], [x1, y0, 34], [x1, y1, 34], [x0, y1, 34]], 'none', OURO, 4));
        var t = CAMINHO([[[x0 - 6, y0 - 6, 6], [x1 + 6, y0 - 6, 6], [x1 + 6, y1 + 6, 6], [x0 - 6, y1 + 6, 6]], [[x0 + 14, y0 + 8, 6], [x1 - 14, y0 + 8, 6], [x1 - 14, y1 - 6, 6], [x0 + 14, y1 - 6, 6]]], 'url(#gr2)') + POLI([[x0 - 6, y1 + 6, 3], [x1 + 6, y1 + 6, 3], [x1 + 6, y1 + 6, 6], [x0 - 6, y1 + 6, 6]], PEDRA.l) + POLI([[x1 + 6, y0 - 6, 3], [x1 + 6, y1 + 6, 3], [x1 + 6, y1 + 6, 6], [x1 + 6, y0 - 6, 6]], PEDRA.r);
        s += SOBE(t, 60, 4.5);
        var c = PT(110, 31, -30); s += '<ellipse cx="' + c.x + '" cy="' + c.y + '" rx="95" ry="42" fill="url(#cb)" stroke="#5b6670" stroke-width="2"/><ellipse cx="' + c.x + '" cy="' + (c.y - 6) + '" rx="72" ry="28" fill="url(#fu)"/>';
        s += ETQ(1, 80, 120, 'Recorte e polimento', CLARO) + ETQ(2, 80, 300, 'Tampo colado por baixo', CLARO) + ETQ(3, 560, 300, 'Furo da cuba', CLARO) + ETQ(4, 560, 440, 'Cuba por baixo', CLARO);
        return SV(s); } }
   ] },
 { id: 'cubas', tit: 'Tipos de cuba', sub: 'Sobrepor, embutir, flush ou esculpida', busca: 'cuba',
   telas: [
    { tit: 'Os 4 jeitos de instalar a cuba', sub: 'Veja a pedra cortada de lado', num: 0,
      pontos: ['Sobrepor: a borda da cuba fica por cima da pedra', 'Embutir: a cuba fica por baixo e só aparece a bacia', 'Flush: a borda fica no mesmo nível da pedra', 'Esculpida: a própria pedra vira a cuba'],
      svg: function () { var s = '', n = [['sobrepor', 'Sobrepor'], ['embutir', 'Embutir'], ['flush', 'Flush (no nível)'], ['esculpida', 'Esculpida']];
        n.forEach(function (c, i) { var ox = (i % 2) * 400 + 10, oy = Math.floor(i / 2) * 250; s += cubaCorte(ox, oy - 20, c[0]) + T(ox + 190, oy + 215, c[1], { a: 'middle', s: 24, w: 700, c: CLARO }); });
        return SV(s); } },
    { tit: 'Cuba de sobrepor', sub: 'A borda da cuba fica apoiada em cima da pedra', num: 0,
      pontos: ['A mais simples e a mais barata', 'Troca fácil se um dia quebrar', 'A borda fica alta: junta sujeira em volta e a água não volta para a cuba'],
      svg: function () { return SV(cubaCorte(40, 20, 'sobrepor', 1.8) + PISCA('<rect x="220" y="121" width="324" height="28" rx="8" fill="none" stroke="' + OURO + '" stroke-width="4"/>') + T(382, 108, 'borda por cima da pedra', { a: 'middle', s: 22 }) + NOTAS3(150, 440, [['Preço', 1, '#e0a050']]) + T(560, 440, 'Mais barata', { s: 20, c: CINZA }), '0 0 800 480'); } },
    { tit: 'Cuba de embutir', sub: 'A cuba é colada por baixo da pedra', num: 0,
      pontos: ['Só aparece a bacia: visual limpo e moderno', 'A água da bancada escorre direto para a cuba', 'Limpeza fácil: dá para puxar a sujeira para dentro da cuba', 'A mais pedida em cozinhas'],
      svg: function () { return SV(cubaCorte(40, 20, 'embutir', 1.8) + CORRE('M120 140 L240 140 L300 270', 2.4, 0) + CORRE('M690 140 L570 140 L500 270', 2.4, 1.1) + T(400, 100, 'a borda fica escondida por baixo', { a: 'middle', s: 22 }), '0 0 800 480'); } },
    { tit: 'Cuba flush (no nível)', sub: 'A borda da cuba fica no mesmo nível da pedra', num: 0,
      pontos: ['Fazemos um rebaixo na pedra do tamanho da borda da cuba', 'A borda encaixa e fica lisa com a bancada', 'Acabamento de alto padrão, muito usado com inox'],
      svg: function () { return SV(cubaCorte(40, 20, 'flush', 1.8) + PISCA('<line x1="212" y1="146" x2="588" y2="146" stroke="' + OURO + '" stroke-width="4"/>') + T(400, 108, 'tudo no mesmo nível', { a: 'middle', s: 22 }), '0 0 800 480'); } },
    { tit: 'Cuba esculpida', sub: 'A cuba é feita na própria pedra', num: 1,
      pontos: ['Peças da mesma pedra coladas e polidas formam a bacia', 'Fundo inclinado leva a água para um ralo escondido', 'Sem borda de louça: limpeza fácil e visual de luxo', 'Muito usada em banheiros e lavabos'],
      svg: function () { var s = PAREDE(0, 30, 800, 24) + P('M60 150 H230 L250 320 L560 290 L560 150 H740 V184 H596 V320 L570 342 L240 362 L208 184 H60 Z', 'url(#gr)') + '<path d="M250 320 L560 290" stroke="' + AZUL + '" stroke-width="3"/>' + RC(520, 286, 44, 10, '#3a3a40', 2) +
        CORRE('M270 120 L280 326 L540 300', 2.6, 0) + '<path d="M542 342 V480" stroke="#5b6670" stroke-width="12"/>' +
        ETQ(1, 130, 120, 'Mesma pedra', CLARO) + ETQ(2, 330, 410, 'Fundo inclinado', CLARO) + ETQ(3, 590, 226, 'Ralo escondido', CLARO) + L(590, 243, 560, 290);
        return SV(s); } }
   ] },
 { id: 'saia', tit: 'Saia em 45°', sub: 'A bancada parece uma pedra grossa e maciça', busca: 'saia|45',
   telas: [
    { tit: 'O que é a saia em 45°', sub: 'Uma faixa de pedra na frente que dá a aparência de pedra grossa', num: 1,
      pontos: ['Bancada: a pedra tem 2 cm de espessura', 'Saia: uma faixa da mesma pedra colada na frente (4 a 10 cm)', 'Emenda em 45° bem na quina: quase não aparece', 'Quem olha vê uma pedra grossa e maciça'],
      svg: function () { ISO = { x: 280, y: 130, s: 2.25 }; var s = CAIXA(0, 0, 6, 200, 60, 2) + POLI([[0, 58, 0], [200, 58, 0], [200, 60, 0], [200, 60, 8], [0, 60, 8]], PEDRA.l) + POLI([[200, 0, 0], [200, 60, 0], [200, 60, 8], [200, 0, 8]], PEDRA.r);
        var a = PT(0, 60, 8), b = PT(200, 60, 8), c = PT(200, 0, 8); s += PISCA('<polyline points="' + a.x + ',' + a.y + ' ' + b.x + ',' + b.y + ' ' + c.x + ',' + c.y + '" fill="none" stroke="' + OURO + '" stroke-width="4"/>');
        s += ROTULO(1, 60, 20, 8, 90, 70, 'Bancada (2 cm)') + ROTULO(2, 100, 60, 3, 90, 450, 'Saia (4 a 10 cm)') + ROTULO(3, 190, 60, 8, 560, 450, 'Emenda em 45°');
        return SV(s); } },
    { tit: 'Como a emenda fica invisível', sub: 'As duas peças são cortadas a 45° e se encontram na quina', num: 0,
      pontos: ['Cortamos a bancada e a saia em 45°', 'As peças se encaixam formando a quina', 'Colamos e polimos: a emenda some na quina', 'A cor e o desenho da pedra continuam'],
      svg: function () { var s = JUNTA(P('M90 180 H600 L630 210 H90 Z', 'url(#gr)'), -40, -40, 4) + JUNTA(P('M600 210 L630 180 V330 H600 Z', 'url(#gr2)'), 60, 40, 4) +
        T(110, 130, 'Bancada', { s: 22, c: CLARO, w: 600 }) + T(650, 300, 'Saia', { s: 22, c: CLARO, w: 600 }) + T(360, 400, 'Corte a 45° nas duas peças', { a: 'middle', s: 22 }) + L(470, 380, 600, 220);
        return SV(s); } },
    { tit: 'Borda simples × saia em 45°', sub: 'A diferença de quem olha de frente', num: 0,
      pontos: ['Sem saia: a borda mostra a espessura real de 2 cm', 'Com saia: parece um bloco de 4 a 10 cm', 'A saia valoriza cozinhas, ilhas e banheiros'],
      svg: function () { ISO = { x: 200, y: 150, s: 2 }; var s = CAIXA(0, 0, 0, 110, 50, 3); ISO = { x: 585, y: 150, s: 2 }; s += CAIXA(0, 0, 0, 110, 50, 10);
        return SV(s + SELO(200, 70, 'BORDA SIMPLES', CINZA) + SELO(600, 70, 'COM SAIA 45°', VERDE) + T(200, 400, 'parece fina (2 cm)', { a: 'middle', s: 22, c: CLARO }) + T(600, 400, 'parece maciça (6 cm)', { a: 'middle', s: 22, c: CLARO })); } }
   ] },
 { id: 'bordas', tit: 'Acabamento da borda', sub: 'Reto, boleado, chanfrado ou meia-cana', busca: 'boleado|chanfr|borda',
   telas: [
    { tit: 'Os formatos de borda', sub: 'A quina da pedra vista de lado', num: 0,
      pontos: ['Reto: quina quase viva, só quebrada. Moderno, o mais pedido', 'Boleado: totalmente arredondado. Mais seguro para crianças', 'Chanfrado: quinas cortadas em ângulo. Discreto', 'Meia-cana: arredondado só em cima'],
      svg: function () { var s = '', f = [['reto', 'Reto'], ['boleado', 'Boleado'], ['chanfro', 'Chanfrado'], ['meia', 'Meia-cana']];
        f.forEach(function (b, i) { var ox = (i % 2) * 400 + 40, oy = Math.floor(i / 2) * 230 + 60, x = ox, y = oy, w = 300, h = 60, d;
          if (b[0] === 'reto') d = 'M' + x + ' ' + y + ' H' + (x + w - 4) + ' L' + (x + w) + ' ' + (y + 4) + ' V' + (y + h - 4) + ' L' + (x + w - 4) + ' ' + (y + h) + ' H' + x + ' Z';
          else if (b[0] === 'boleado') d = 'M' + x + ' ' + y + ' H' + (x + w - 30) + ' A30 30 0 0 1 ' + (x + w - 30) + ' ' + (y + h) + ' H' + x + ' Z';
          else if (b[0] === 'chanfro') d = 'M' + x + ' ' + y + ' H' + (x + w - 16) + ' L' + (x + w) + ' ' + (y + 16) + ' V' + (y + h - 16) + ' L' + (x + w - 16) + ' ' + (y + h) + ' H' + x + ' Z';
          else d = 'M' + x + ' ' + y + ' H' + (x + w - 30) + ' A30 30 0 0 1 ' + (x + w) + ' ' + (y + 30) + ' V' + (y + h) + ' H' + x + ' Z';
          s += P(d, 'url(#gr)') + T(ox + 150, oy + 115, b[1], { a: 'middle', s: 26, w: 700, c: CLARO }); });
        return SV(s); } }
   ] },
 { id: 'frontao', tit: 'Frontão e espelho', sub: 'A pedra que protege a parede', busca: 'frontao|espelho',
   telas: [
    { tit: 'O que é o frontão', sub: 'A faixa de pedra em pé, encostada na parede', num: 1,
      pontos: ['Frontão: faixa de 7 a 15 cm atrás da bancada', 'Bancada', 'Protege a parede de água, gordura e respingos', 'Feito da mesma pedra, com acabamento em cima'],
      svg: function () { ISO = { x: 380, y: 90, s: 2.5 }; var s = PAREDE3D(0, 200, 70) + CAIXA(0, 0, 0, 200, 60, 4) + PISCA(CAIXA(0, 0, 4, 200, 2, 12));
        s += GOTA(PT(90, 20, 30).x, PT(90, 20, 30).y) + CORRE('M' + PT(80, 30, 30).x + ' ' + PT(80, 30, 30).y + ' L' + PT(80, 4, 10).x + ' ' + PT(80, 4, 10).y, 2, 0);
        s += ROTULO(1, 160, 1, 14, 600, 80, 'Frontão (7 a 15 cm)') + ROTULO(2, 100, 50, 4, 120, 420, 'Bancada') + ROTULO(3, 40, 0, 40, 90, 70, 'Parede protegida');
        return SV(s); } },
    { tit: 'Espelho: pedra até o armário', sub: 'Quando a pedra sobe até os armários de cima', num: 0,
      pontos: ['Em vez de azulejo, a parede inteira atrás da pia fica em pedra', 'Não tem rejunte para encardir', 'Fica com aparência de cozinha planejada de alto padrão'],
      svg: function () { ISO = { x: 380, y: 60, s: 2.4 }; var s = PAREDE3D(0, 200, 110) + CAIXA(0, 0, 0, 200, 60, 4) + PISCA(CAIXA(0, 0, 4, 200, 2, 60)) + CAIXA(0, 0, 70, 200, 35, 36, { t: '#3d342a', l: '#57493a', r: '#4a3e31' });
        return SV(s + T(120, 460, 'Espelho de pedra até o armário', { s: 24, c: CLARO, w: 600 })); } }
   ] },
 { id: 'pingadeira', tit: 'Peitoril com pingadeira', sub: 'Proteção contra água e infiltração', busca: 'peitoril|pingadeira',
   telas: [
    { tit: 'Sem pingadeira', sub: 'A água volta por baixo da pedra até a parede', num: 0,
      pontos: ['A gota escorre por baixo do peitoril', 'Chega na parede e desce por ela', 'Com o tempo: mancha, mofo e infiltração'],
      svg: function () { var s = PAREDE(80, 40, 140, 440) + RC(150, 60, 40, 150, '#6fa6c9') + P('M150 210 H620 V236 H150 Z', 'url(#gr)') + '<rect x="220" y="236" width="18" height="230" fill="#4b3d2c" opacity=".7"><animate attributeName="height" values="0;230;230" dur="4s" repeatCount="indefinite"/></rect>';
        s += CORRE('M560 150 L600 206 L620 222 L612 238 L230 238 L226 470', 4, 0) + SELO(500, 80, 'SEM PINGADEIRA', VERM) + T(260, 330, 'A água volta pela parede', { s: 22, c: VERM, w: 600 }) + T(260, 360, 'e mancha', { s: 22, c: VERM, w: 600 });
        return SV(s); } },
    { tit: 'Com pingadeira', sub: 'Um friso por baixo faz a gota cair longe da parede', num: 1,
      pontos: ['Pingadeira: um friso cortado por baixo da pedra', 'A gota não passa do friso e cai lá fora', 'Caimento para fora: a chuva não empoça', 'Parede seca e sem mancha'],
      svg: function () { var s = PAREDE(80, 40, 140, 440) + RC(150, 60, 40, 150, '#6fa6c9') + P('M150 206 H620 V236 H566 V244 H554 V236 H150 Z', 'url(#gr)');
        s += CORRE('M560 150 L600 204 L620 222 L612 238 L572 240 L572 470', 3.4, 0) + PISCA('<rect x="552" y="234" width="16" height="14" fill="none" stroke="' + OURO + '" stroke-width="3"/>');
        s += ETQ(1, 470, 300, 'Pingadeira', CLARO) + L(478, 288, 552, 246) + ETQ(2, 620, 420, 'A gota cai aqui', CLARO) + ETQ(3, 330, 160, 'Caimento para fora', CLARO) + ETQ(4, 250, 320, 'Parede seca', VERDE) + SELO(500, 80, 'COM PINGADEIRA', VERDE);
        return SV(s); } }
   ] },
 { id: 'nicho', tit: 'Nicho embutido', sub: 'Prateleira dentro da parede do box', busca: 'nicho',
   telas: [
    { tit: 'O que é o nicho', sub: 'Um "buraco" revestido de pedra dentro da parede', num: 1,
      pontos: ['Moldura em 45° na frente: parece pedra maciça', 'Base com leve caimento: a água não empoça', 'Fundo e laterais em pedra: nada de rejunte encardido', 'Medidas por dentro do jeito que você precisa (ex.: 60 × 30 cm)'],
      svg: function () { var s = '<rect width="800" height="500" fill="#2a2a30"/>' + RC(190, 70, 420, 300, 'url(#gr)', 4) + RC(222, 102, 356, 236, '#141418', 2) + '<path d="M190 70 L222 102 M610 70 L578 102 M190 370 L222 338 M610 370 L578 338" stroke="' + TINTA + '" stroke-width="2"/>' +
        P('M222 102 L260 130 V300 L222 338 Z', 'url(#gr3)') + P('M222 102 H578 L540 130 H260 Z', 'url(#gr2)') + RC(260, 130, 280, 170, 'url(#gr2)') + P('M222 338 L260 300 H540 L578 338 Z', 'url(#gr)') + '<rect x="330" y="248" width="34" height="52" rx="6" fill="#c97fb0"/><rect x="380" y="232" width="40" height="68" rx="6" fill="#7fb0c9"/>' +
        NUM(1, 150, 220) + L(167, 220, 192, 220, { n: 1 }) + NUM(2, 400, 420) + L(400, 403, 400, 330) + NUM(3, 650, 220) + L(633, 220, 545, 220) + T(400, 470, 'medida por dentro: largura × altura × profundidade', { a: 'middle', s: 19, c: CINZA });
        return SV(s); } }
   ] },
 { id: 'pedras', tit: 'Granito, mármore ou quartzo?', sub: 'Cada pedra tem o seu ponto forte', busca: '',
   telas: [
    { tit: 'Granito, mármore, quartzo e quartzito', sub: 'Mais quadrinhos verdes = mais resistente', num: 0,
      pontos: ['Granito: natural, muito resistente e com o melhor custo. Cada chapa é única', 'Mármore: veios elegantes, mas risca e mancha com ácidos (limão, vinagre)', 'Quartzo: industrializado, cor uniforme e quase não mancha. Evite panela quente direto', 'Quartzito: natural, com cara de mármore e resistência de granito'],
      svg: function () {
        var lin = [['Resiste a risco', 4, 2, 4, 4], ['Resiste a mancha', 3, 1, 5, 3], ['Resiste ao calor', 5, 3, 2, 5], ['Preço', 1, 3, 3, 4]], cols = ['Granito', 'Mármore', 'Quartzo', 'Quartzito'], cor = ['url(#gr)', '#ece7df', '#e9e9e6', '#d8d2c6'], s = '';
        cols.forEach(function (c, i) { var x = 255 + i * 140; s += RC(x - 40, 20, 80, 50, cor[i], 8) + (i === 1 ? '<path d="M' + (x - 36) + ' 30 Q' + x + ' 50 ' + (x + 36) + ' 40" stroke="#9c958a" stroke-width="2" fill="none"/>' : '') + T(x, 100, c, { a: 'middle', s: 21, w: 700, c: CLARO }); });
        lin.forEach(function (l, j) { var y = 160 + j * 80; s += T(10, y + 7, l[0], { s: 19 });
          for (var i = 0; i < 4; i++) for (var k = 0; k < 5; k++) s += '<rect x="' + (197 + i * 140 + k * 24) + '" y="' + (y - 9) + '" width="19" height="19" rx="4" fill="' + (k < l[i + 1] ? (j === 3 ? '#e0a050' : VERDE) : 'rgba(255,255,255,.12)') + '"/>'; });
        return SV(s + T(400, 490, 'No preço: mais quadrinhos = mais caro', { a: 'middle', s: 17, c: CINZA }));
      } }
   ] },
 { id: 'superficie', tit: 'Polido, levigado ou flameado?', sub: 'O acabamento da superfície', busca: 'levigad|flamead|escovad',
   telas: [
    { tit: 'Polido, levigado ou flameado', sub: 'Cada acabamento para um lugar', num: 0,
      pontos: ['Polido: brilhante, realça a cor. O mais usado em bancadas', 'Levigado (escovado): fosco e aveludado, disfarça marcas de dedo', 'Flameado: áspero e antiderrapante, para área externa, escada e piscina'],
      svg: function () { var dots = ''; for (var i = 0; i < 200; i++) dots += '<circle cx="' + (570 + (i * 37 % 180)) + '" cy="' + (125 + (i * 53 % 220)) + '" r="' + (1 + i % 3) + '" fill="rgba(40,36,30,.5)"/>';
        return SV(RC(40, 110, 200, 240, 'url(#gr)', 14) + '<path d="M60 130 L130 130 L60 230 Z" fill="rgba(255,255,255,.6)"><animate attributeName="opacity" values=".2;.8;.2" dur="2.5s" repeatCount="indefinite"/></path>' +
          RC(300, 110, 200, 240, 'url(#gr2)', 14) + RC(560, 110, 200, 240, '#8f8a80', 14) + dots +
          T(140, 400, 'Polido', { a: 'middle', s: 26, w: 700, c: CLARO }) + T(400, 400, 'Levigado', { a: 'middle', s: 26, w: 700, c: CLARO }) + T(660, 400, 'Flameado', { a: 'middle', s: 26, w: 700, c: CLARO }) +
          T(140, 432, 'brilho · bancadas', { a: 'middle', s: 18, c: CINZA }) + T(400, 432, 'fosco · banheiros', { a: 'middle', s: 18, c: CINZA }) + T(660, 432, 'não escorrega · área externa', { a: 'middle', s: 18, c: CINZA })); } }
   ] },
 { id: 'imperm', tit: 'Impermeabilização', sub: 'Proteção invisível contra manchas', busca: 'impermeab',
   telas: [
    { tit: 'Impermeabilização', sub: 'Veja a diferença com uma gota de café', num: 0,
      pontos: ['O produto entra nos poros da pedra e fecha a passagem de líquidos', 'Com proteção, a gota fica em cima: é só passar um pano', 'Sem proteção, óleo, café e vinho entram na pedra e mancham', 'Recomendamos refazer a cada 1 ou 2 anos'],
      svg: function () { return SV(RC(40, 260, 330, 80, 'url(#gr)') + RC(430, 260, 330, 80, 'url(#gr)') + SELO(205, 60, 'COM PROTEÇÃO', VERDE) + SELO(595, 60, 'SEM PROTEÇÃO', VERM) +
        '<ellipse cx="205" cy="238" rx="46" ry="24" fill="#7a4a24"/><ellipse cx="190" cy="230" rx="12" ry="6" fill="rgba(255,255,255,.55)"/>' +
        '<ellipse cx="595" cy="240" rx="46" ry="24" fill="#7a4a24"><animate attributeName="ry" values="24;24;2;2" keyTimes="0;.3;.7;1" dur="5s" repeatCount="indefinite"/><animate attributeName="cy" values="240;240;259;259" keyTimes="0;.3;.7;1" dur="5s" repeatCount="indefinite"/></ellipse>' +
        '<path d="M545 262 Q595 318 645 262 Z" fill="#5a3a20" opacity="0"><animate attributeName="opacity" values="0;0;.85;.85" keyTimes="0;.3;.7;1" dur="5s" repeatCount="indefinite"/></path>' +
        T(205, 400, 'a gota fica em cima', { a: 'middle', s: 22, c: CLARO }) + T(595, 400, 'a pedra absorve e mancha', { a: 'middle', s: 22, c: CLARO })); } }
   ] },
 { id: 'cooktop', tit: 'Recorte de cooktop e cuba', sub: 'Feitos pela medida do seu aparelho', busca: 'cooktop',
   telas: [
    { tit: 'Recortes sob medida', sub: 'Pela medida do manual ou do próprio aparelho', num: 1,
      pontos: ['Recorte do cooktop do tamanho exato do aparelho', 'Furo da cuba', 'Furo da torneira já pronto', 'Cantos arredondados por dentro: a pedra não trinca'],
      svg: function () { ISO = { x: 380, y: 150, s: 2.15 }; var s = CAMINHO([[[0, 0, 4], [200, 0, 4], [200, 60, 4], [0, 60, 4]], [[25, 12, 4], [80, 12, 4], [80, 50, 4], [25, 50, 4]], [[120, 12, 4], [175, 12, 4], [175, 50, 4], [120, 50, 4]]], PEDRA.t) + POLI([[0, 60, 0], [200, 60, 0], [200, 60, 4], [0, 60, 4]], PEDRA.l) + POLI([[200, 0, 0], [200, 60, 0], [200, 60, 4], [200, 0, 4]], PEDRA.r);
        s += POLI([[25, 12, 4], [80, 12, 4], [80, 50, 4], [25, 50, 4]], '#18181c') + POLI([[120, 12, 4], [175, 12, 4], [175, 50, 4], [120, 50, 4]], 'url(#fu)');
        var tp = PT(147, 5, 4); s += '<ellipse cx="' + tp.x + '" cy="' + tp.y + '" rx="7" ry="4" fill="#111"/>';
        s += ROTULO(1, 50, 30, 4, 90, 80, 'Cooktop') + ROTULO(2, 150, 35, 4, 600, 440, 'Cuba') + ROTULO(3, 147, 5, 4, 600, 70, 'Torneira') + ROTULO(4, 80, 50, 4, 90, 440, 'Cantos arredondados');
        return SV(s); } }
   ] },
 { id: 'processo', tit: 'Como fazemos o seu projeto', sub: 'Do orçamento à instalação', busca: '',
   telas: [
    { tit: 'Do orçamento à instalação', sub: 'Quatro passos, tudo com a nossa equipe', num: 1,
      pontos: ['Medição no local: medimos tudo no seu imóvel, sem chute', 'Projeto: você vê o desenho e confirma pedra e acabamentos', 'Oficina: corte e acabamento das peças', 'Instalação pela nossa equipe, com limpeza no final'],
      svg: function () { var n = ['Medição', 'Projeto', 'Oficina', 'Instalação'], ic = ['📏', '📐', '⚙️', '🏠'], s = '';
        n.forEach(function (t, i) { var x = 110 + i * 193; s += '<circle cx="' + x + '" cy="210" r="72" fill="rgba(201,168,76,.13)" stroke="' + OURO + '" stroke-width="3"><animate attributeName="stroke-width" values="3;8;3" dur="4s" begin="' + i + 's" repeatCount="indefinite"/></circle>' + T(x, 232, ic[i], { a: 'middle', s: 56 }) + NUM(i + 1, x - 52, 150) + T(x, 325, t, { a: 'middle', s: 25, w: 700, c: CLARO }); if (i < 3) s += L(x + 80, 210, x + 113, 210); });
        return SV(s + T(400, 430, 'O prazo começa a contar depois da medição e do sinal', { a: 'middle', s: 21, c: CINZA })); } }
   ] },
 { id: 'cuidados', tit: 'Cuidados com a pedra', sub: 'Para durar a vida toda', busca: '',
   telas: [
    { tit: 'Cuidados com a pedra', sub: 'O que pode e o que evitar', num: 0,
      pontos: ['Limpe com pano úmido e detergente neutro', 'Evite limão, vinagre, água sanitária e produtos com ácido, principalmente no mármore', 'Use tábua para cortar e descanso para panela quente', 'Refaça a impermeabilização a cada 1 ou 2 anos'],
      svg: function () { var it = [['🧽', 'Detergente neutro', 1], ['🍋', 'Limão e vinagre', 0], ['🍳', 'Panela quente direto', 0], ['💧', 'Impermeabilizar', 1]], s = '';
        it.forEach(function (x, i) { var cx = 170 + (i % 2) * 380, cy = 140 + Math.floor(i / 2) * 210; s += '<circle cx="' + (cx - 60) + '" cy="' + cy + '" r="60" fill="' + (x[2] ? 'rgba(95,211,138,.16)' : 'rgba(255,100,80,.14)') + '"/>' + T(cx - 60, cy + 20, x[0], { a: 'middle', s: 56 }) +
          T(cx + 18, cy - 4, x[1], { s: 24, w: 700, c: CLARO }) + T(cx + 18, cy + 30, x[2] ? '✓ Pode usar' : '✕ Evite', { s: 21, c: x[2] ? VERDE : VERM, w: 600 }); });
        return SV(s); } }
   ] }
];
