/* ═══════════════════════════════════════════════════════════════════
   app-cameras.js — 📹 Câmeras (Yoosee)  v1
   HR Mármores e Granitos

   • Ao vivo: todas as câmeras (go2rtc no PC da loja, pelo túnel da Cloudflare).
   • Eventos: fotos de cada movimento na câmera da entrada (conferir o ponto)
     e dos movimentos fora do horário (os mesmos que vão de alerta no WhatsApp).
   • Gravações: blocos de 10 min gravados no PC da loja (sem depender do app Yoosee).
   • Ajustes: nome de cada câmera, qual é a da entrada, horário dos alertas.
   O PC da loja roda o agente (cameras/agente.ps1) — instalação: bot → "instalar câmeras".
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PG = 79, INFO = null, ABA = 'vivo', DIA = '', FOCO = '';
  try { if (localStorage.getItem('hr_balcao') === '1') return; } catch (e) {}

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function nome(id) { var c = INFO && INFO.cfg && INFO.cfg.nomes && INFO.cfg.nomes[id]; if (c) return c; var x = INFO && (INFO.cams || []).filter(function (z) { return z.id === id; })[0]; return (x && x.nome) || id; }
  function api(p, opt) { return fetch(base() + p, Object.assign({ headers: hdr() }, opt || {})).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; }); }

  var st = document.createElement('style');
  st.textContent = [
    '#pg79{padding:12px 12px 110px!important}',
    '.cm-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '.cm-top h2{font-family:"Cormorant Garamond",serif;color:#ecd27c;font-size:1.5rem;margin:0 auto 0 0}',
    '.cm-st{font-size:.78rem;color:#c8bb9c}',
    '.cm-tabs{display:flex;gap:6px;margin-bottom:10px}',
    '.cm-tabs button,.cm-bt{background:#16140f;border:1px solid rgba(201,168,76,.3);color:#e8dcc0;border-radius:10px;padding:8px 12px;font:inherit;font-size:.82rem}',
    '.cm-tabs button.on{background:linear-gradient(135deg,#c9a84c,#8a6d2a);color:#111;border-color:transparent;font-weight:700}',
    '.cm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}',
    '.cm-cam{position:relative;background:#000;border:1px solid rgba(201,168,76,.25);border-radius:12px;overflow:hidden;aspect-ratio:16/9}',
    '.cm-cam iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
    '.cm-cam .cm-n{position:absolute;left:8px;top:6px;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;padding:3px 8px;border-radius:6px;z-index:2}',
    '.cm-cam .cm-x{position:absolute;right:6px;top:6px;z-index:2;background:rgba(0,0,0,.6);border:0;color:#fff;border-radius:6px;padding:3px 8px;font-size:.8rem}',
    '.cm-cam.foco{grid-column:1/-1}',
    '.cm-evs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.cm-ev{background:#16140f;border:1px solid rgba(201,168,76,.18);border-radius:10px;overflow:hidden;font-size:.75rem;color:#c8bb9c}',
    '.cm-ev img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}',
    '.cm-ev div{padding:5px 7px;display:flex;justify-content:space-between}',
    '.cm-vazio{padding:28px;text-align:center;color:#9a8f78;line-height:1.6}',
    '.cm-cfg label{display:block;margin:10px 0 4px;color:#c8bb9c;font-size:.8rem}',
    '.cm-cfg input,.cm-cfg select{width:100%;background:#0f0e0b;border:1px solid rgba(201,168,76,.25);color:#f3ecdb;border-radius:8px;padding:8px;font:inherit}',
    '.cm-cmd{font-family:monospace;font-size:.72rem;background:#0f0e0b;border:1px dashed rgba(201,168,76,.35);padding:8px;border-radius:8px;word-break:break-all;color:#ecd27c}',
    '.cm-big{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center}',
    '.cm-big img{max-width:96vw;max-height:90vh;border-radius:8px}',
    '.cm-blocos{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.cm-blocos button{background:#16140f;border:1px solid rgba(201,168,76,.25);color:#e8dcc0;border-radius:8px;padding:6px 9px;font:inherit;font-size:.78rem}',
    '.cm-blocos button.on{background:#c9a84c;color:#111;font-weight:700}',
    '.cm-player{width:100%;max-height:62vh;background:#000;border-radius:12px;border:1px solid rgba(201,168,76,.25)}',
    '.cm-ev .cm-play{background:none;border:0;color:#ecd27c;font:inherit;font-size:.75rem;padding:0}'
  ].join('\n');
  document.head.appendChild(st);

  function montar() {
    var nav = document.getElementById('nav'), pages = document.getElementById('pages'); if (!nav || !pages) return false;
    if (!nav.querySelector('[data-pg="79"]')) {
      var ni = document.createElement('div'); ni.className = 'ni'; ni.setAttribute('data-pg', String(PG));
      ni.innerHTML = '<span class="ni-i">📹</span><span class="ni-l">Câmeras</span>';
      ni.addEventListener('click', function (e) { e.stopPropagation(); go(PG); });
      var ref = nav.querySelector('[data-pg="7"]'); if (ref) nav.insertBefore(ni, ref); else nav.appendChild(ni);
    }
    if (!document.getElementById('pg79')) { var pg = document.createElement('div'); pg.className = 'pg'; pg.id = 'pg79'; pages.appendChild(pg); }
    return true;
  }
  function instalarGo() {
    if (typeof window.go !== 'function' || window.go._cam) return false;
    var o = window.go; window.go = function (n) { var r = o.apply(this, arguments); if (+n === PG) abrir(); else pararVideo(); return r; }; window.go._cam = true; return true;
  }
  function el() { return document.getElementById('pg79'); }
  function pararVideo() { var e = el(); if (e) { e.querySelectorAll('iframe').forEach(function (f) { f.src = 'about:blank'; }); e.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (x) {} }); } }

  function abrir() {
    var e = el(); if (!e) return;
    if (!base()) { e.innerHTML = '<div class="cm-vazio">O bot não está configurado neste aparelho (Secretária → WhatsApp Bot).</div>'; return; }
    e.innerHTML = '<div class="cm-vazio">Carregando as câmeras…</div>';
    api('/bot/cam/info').then(function (r) { return r.json(); }).then(function (j) { INFO = j; desenhar(); })
      .catch(function () { e.innerHTML = '<div class="cm-vazio">Não consegui falar com o bot. Confira a internet.</div>'; });
  }
  function desenhar() {
    var e = el(); if (!e) return; var cams = (INFO && INFO.cams) || [];
    var st = !INFO || !INFO.em ? '⚪ Ainda não instalado no PC da loja' : INFO.noAr ? '🟢 PC da loja no ar · ' + cams.length + ' câmera(s)' : '🔴 PC da loja sem sinal (desligado ou sem internet)';
    var h = '<div class="cm-top"><h2>📹 Câmeras</h2><span class="cm-st">' + st + '</span><button class="cm-bt" data-cm="rec">↻</button></div>' +
      '<div class="cm-tabs"><button data-ab="vivo" class="' + (ABA === 'vivo' ? 'on' : '') + '">Ao vivo</button><button data-ab="grav" class="' + (ABA === 'grav' ? 'on' : '') + '">Gravações</button><button data-ab="ev" class="' + (ABA === 'ev' ? 'on' : '') + '">Eventos e ponto</button><button data-ab="cfg" class="' + (ABA === 'cfg' ? 'on' : '') + '">Ajustes</button></div><div id="cmCorpo"></div>';
    e.innerHTML = h;
    e.onclick = clique; e.onchange = mudou;
    if (ABA === 'vivo') vivo(); else if (ABA === 'grav') gravacoes(); else if (ABA === 'ev') eventos(); else ajustes();
  }
  function vivo() {
    var c = document.getElementById('cmCorpo'), cams = (INFO && INFO.cams) || [];
    if (!INFO || !INFO.url || !cams.length) { c.innerHTML = '<div class="cm-vazio">' + (INFO && INFO.erro ? esc(INFO.erro) + '<br>' : '') + 'Instale o agente no PC da loja (aba Ajustes) para ver as câmeras aqui.</div>'; return; }
    var lista = FOCO ? cams.filter(function (x) { return x.id === FOCO; }) : cams;
    c.innerHTML = '<div class="cm-grid">' + lista.map(function (x) {
      var src = INFO.url + '/stream.html?src=' + encodeURIComponent(FOCO ? x.id : x.id + '_sub') + '&mode=mse,webrtc,hls';
      return '<div class="cm-cam' + (FOCO ? ' foco' : '') + '"><span class="cm-n">' + esc(nome(x.id)) + '</span><button class="cm-x" data-foco="' + esc(x.id) + '">' + (FOCO ? '✕ Todas' : '⛶ Ampliar') + '</button><iframe src="' + esc(src) + '" allow="autoplay; fullscreen" title="' + esc(nome(x.id)) + '"></iframe></div>';
    }).join('') + '</div>' + (INFO.noAr ? '' : '<div class="cm-vazio">O PC da loja não está respondendo: o vídeo pode não abrir.</div>');
  }
  var URLS = [];
  function eventos() {
    var c = document.getElementById('cmCorpo'); DIA = DIA || hoje();
    var cams = (INFO && INFO.cams) || [];
    c.innerHTML = '<div class="cm-top"><input type="date" id="cmDia" value="' + DIA + '" class="cm-bt"><select id="cmCam" class="cm-bt"><option value="">Todas</option>' + cams.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(nome(x.id)) + '</option>'; }).join('') + '</select></div><div id="cmEvs" class="cm-vazio">Carregando…</div>';
    carregarEv();
  }
  function carregarEv() {
    var box = document.getElementById('cmEvs'); if (!box) return;
    var cam = (document.getElementById('cmCam') || {}).value || '';
    URLS.forEach(function (u) { URL.revokeObjectURL(u); }); URLS = [];
    api('/bot/cam/eventos?dia=' + DIA + (cam ? '&cam=' + encodeURIComponent(cam) : '')).then(function (r) { return r.json(); }).then(function (j) {
      var ev = j.eventos || [];
      if (!ev.length) { box.className = 'cm-vazio'; box.innerHTML = 'Nenhum movimento guardado neste dia.<br><small>No horário de trabalho só a câmera da entrada guarda fotos (para o ponto). Fora do horário, todas.</small>'; return; }
      box.className = 'cm-evs';
      box.innerHTML = ev.slice().reverse().map(function (x) { var h = new Date(x.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); return '<div class="cm-ev"><img data-id="' + x.id + '" alt=""><div><b>' + h + '</b><span>' + esc(nome(x.cam)) + '</span></div><div><button class="cm-play" data-grav="' + esc(x.cam) + '|' + x.ts + '">▶ ver a gravação</button></div></div>'; }).join('');
      var imgs = box.querySelectorAll('img[data-id]'), io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); foto(en.target); } }); }) : null;
      imgs.forEach(function (im) { if (io) io.observe(im); else foto(im); });
    }).catch(function () { box.textContent = 'Não consegui carregar os eventos.'; });
  }
  function foto(im) { api('/bot/cam/foto?id=' + im.getAttribute('data-id')).then(function (r) { return r.blob(); }).then(function (b) { var u = URL.createObjectURL(b); URLS.push(u); im.src = u; }).catch(function () {}); }
  var GL = null, GCAM = '', GDIA = '', GARQ = '', GSEEK = 0;
  function gurl(p) { var g = INFO && INFO.grav; return g && g.url ? g.url + p + (p.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(g.tok) : ''; }
  function gravacoes() {
    var c = document.getElementById('cmCorpo');
    if (!INFO || !INFO.grav || !INFO.grav.url) { c.innerHTML = '<div class="cm-vazio">As gravações ainda não estão ligadas.<br>Rode de novo a linha de instalação no PC da loja (aba Ajustes) para atualizar o programa.</div>'; return; }
    c.innerHTML = '<div class="cm-vazio">Buscando as gravações no PC da loja…</div>';
    fetch(gurl('/lista')).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { GL = j; desenharGrav(); })
      .catch(function () { c.innerHTML = '<div class="cm-vazio">O PC da loja não respondeu. Confira se ele está ligado e com internet.</div>'; });
  }
  function desenharGrav() {
    var c = document.getElementById('cmCorpo'); if (!c || !GL) return;
    var cams = Object.keys(GL.cams || {}); if (!cams.length) { c.innerHTML = '<div class="cm-vazio">Ainda não há gravações.</div>'; return; }
    if (!GCAM || cams.indexOf(GCAM) < 0) GCAM = cams[0];
    var l = GL.cams[GCAM] || [], dias = []; l.forEach(function (x) { if (dias.indexOf(x.d) < 0) dias.push(x.d); });
    if (!GDIA || dias.indexOf(GDIA) < 0) GDIA = dias[dias.length - 1] || '';
    var bl = l.filter(function (x) { return x.d === GDIA; });
    if (!GARQ && bl.length) GARQ = bl[bl.length - 1].f;
    c.innerHTML = '<div class="cm-top"><select id="cmGCam" class="cm-bt">' + cams.map(function (x) { return '<option value="' + esc(x) + '"' + (x === GCAM ? ' selected' : '') + '>' + esc(nome(x)) + '</option>'; }).join('') + '</select>' +
      '<select id="cmGDia" class="cm-bt">' + dias.slice().reverse().map(function (d) { return '<option value="' + d + '"' + (d === GDIA ? ' selected' : '') + '>' + d.split('-').reverse().join('/') + '</option>'; }).join('') + '</select>' +
      (GL.livreGB != null ? '<span class="cm-st">Disco livre no PC: ' + GL.livreGB + ' GB</span>' : '') + '</div>' +
      (GARQ ? '<video class="cm-player" id="cmVid" controls autoplay playsinline src="' + esc(gurl('/v/' + GCAM + '/' + GARQ)) + '"></video>' : '') +
      '<div class="cm-blocos">' + bl.map(function (x) { return '<button data-arq="' + esc(x.f) + '" class="' + (x.f === GARQ ? 'on' : '') + '">' + x.h + '</button>'; }).join('') + '</div>';
    var v = document.getElementById('cmVid');
    if (v) { if (GSEEK) { var s0 = GSEEK; GSEEK = 0; v.addEventListener('loadedmetadata', function () { try { v.currentTime = s0; } catch (e) {} }, { once: true }); }
      v.addEventListener('ended', function () { var i = bl.map(function (x) { return x.f; }).indexOf(GARQ); if (i >= 0 && i < bl.length - 1) { GARQ = bl[i + 1].f; desenharGrav(); } }); }
  }
  function abrirGravacao(cam, ts) { // do evento (foto) para o vídeo daquele momento
    var d = new Date(ts), dia = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    ABA = 'grav'; GCAM = cam; GDIA = dia; GARQ = ''; desenhar();
    var t = setInterval(function () { if (!GL) return; clearInterval(t); var l = (GL.cams[cam] || []).filter(function (x) { return x.d === dia; }), alvo = null;
      l.forEach(function (x) { var p = x.h.split(':'), ini = new Date(d); ini.setHours(+p[0], +p[1], +(x.f.slice(-6, -4)) || 0, 0); if (ini.getTime() <= ts) alvo = { x: x, off: (ts - ini.getTime()) / 1000 }; });
      if (alvo) { GARQ = alvo.x.f; GSEEK = Math.max(0, alvo.off - 5); desenharGrav(); } else if (typeof toast === 'function') toast('Não achei gravação desse horário'); }, 300);
    setTimeout(function () { clearInterval(t); }, 15000);
  }
  function ajustes() {
    var c = document.getElementById('cmCorpo'), cfg = (INFO && INFO.cfg) || {}, cams = (INFO && INFO.cams) || [];
    c.innerHTML = '<div class="cm-cfg">' +
      (cams.length ? cams.map(function (x) { return '<label>Nome da ' + esc(x.id) + ' (' + esc(x.ip || '') + ')</label><input data-nome="' + esc(x.id) + '" value="' + esc(nome(x.id)) + '">'; }).join('') +
        '<label>Câmera da entrada (as chegadas e saídas para conferir o ponto)</label><select data-k="entrada">' + cams.map(function (x) { return '<option value="' + esc(x.id) + '"' + ((cfg.entrada || cams[0].id) === x.id ? ' selected' : '') + '>' + esc(nome(x.id)) + '</option>'; }).join('') + '</select>' : '') +
      '<label>Alerta no WhatsApp com foto quando houver movimento fora do horário</label><select data-k="alertas"><option value="1"' + (cfg.alertas !== false ? ' selected' : '') + '>Ligado</option><option value="0"' + (cfg.alertas === false ? ' selected' : '') + '>Desligado</option></select>' +
      '<label>Fora do horário: de</label><input type="time" data-k="alertaIni" value="' + esc(cfg.alertaIni || '18:30') + '"><label>até</label><input type="time" data-k="alertaFim" value="' + esc(cfg.alertaFim || '06:00') + '">' +
      '<label>Domingo inteiro conta como fora do horário</label><select data-k="domingo"><option value="1"' + (cfg.domingo !== false ? ' selected' : '') + '>Sim</option><option value="0"' + (cfg.domingo === false ? ' selected' : '') + '>Não</option></select>' +
      '<label style="margin-top:18px">Instalar no PC da loja: abra o PowerShell no PC e cole a linha abaixo</label><div class="cm-cmd" id="cmCmd">carregando…</div><button class="cm-bt" data-cm="copiar" style="margin-top:6px">📋 Copiar a linha</button>' +
      '</div>';
    api('/bot/cam/link').then(function (r) { return r.json(); }).then(function (j) { var x = document.getElementById('cmCmd'); if (x) x.textContent = j.comando || ''; }).catch(function () {});
  }
  function salvar(obj) {
    api('/bot/cam/cfg', { method: 'POST', body: JSON.stringify(obj) }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.cfg && INFO) INFO.cfg = j.cfg; if (typeof toast === 'function') toast('Salvo'); }).catch(function () { if (typeof toast === 'function') toast('Não consegui salvar'); });
  }
  function mudou(ev) {
    var t = ev.target;
    if (t.id === 'cmDia') { DIA = t.value || hoje(); carregarEv(); return; }
    if (t.id === 'cmCam') { carregarEv(); return; }
    if (t.id === 'cmGCam') { GCAM = t.value; GDIA = ''; GARQ = ''; desenharGrav(); return; }
    if (t.id === 'cmGDia') { GDIA = t.value; GARQ = ''; desenharGrav(); return; }
    if (t.hasAttribute('data-nome')) { var n = {}; n[t.getAttribute('data-nome')] = t.value; salvar({ nomes: n }); return; }
    var k = t.getAttribute('data-k'); if (!k) return;
    var o = {}; o[k] = (k === 'alertas' || k === 'domingo') ? t.value === '1' : t.value; salvar(o);
  }
  function clique(ev) {
    var a = ev.target.closest('[data-ab],[data-foco],[data-cm],[data-arq],[data-grav],img[data-id]'); if (!a) return;
    if (a.hasAttribute('data-arq')) { GARQ = a.getAttribute('data-arq'); desenharGrav(); return; }
    if (a.hasAttribute('data-grav')) { var g = a.getAttribute('data-grav').split('|'); abrirGravacao(g[0], +g[1]); return; }
    if (a.hasAttribute('data-ab')) { ABA = a.getAttribute('data-ab'); FOCO = ''; GARQ = ''; pararVideo(); desenhar(); return; }
    if (a.hasAttribute('data-foco')) { FOCO = FOCO ? '' : a.getAttribute('data-foco'); pararVideo(); vivo(); return; }
    if (a.tagName === 'IMG') { if (!a.src) return; var d = document.createElement('div'); d.className = 'cm-big'; d.innerHTML = '<img src="' + a.src + '">'; d.onclick = function () { d.remove(); }; document.body.appendChild(d); return; }
    var c = a.getAttribute('data-cm');
    if (c === 'rec') { pararVideo(); abrir(); }
    if (c === 'copiar') { var t = (document.getElementById('cmCmd') || {}).textContent || ''; try { navigator.clipboard.writeText(t); if (typeof toast === 'function') toast('Linha copiada'); } catch (e) {} }
  }
  window.HR_CAMERAS = { abrir: function () { go(PG); } };
  var tent = 0;
  (function iniciar() { var ok = montar() && instalarGo(); if (!ok && tent++ < 60) setTimeout(iniciar, 250); })();
})();
