// ═══════════════════════════════════════════════════════════════════
// app-entrada.js v1 — abertura animada do app + sons e toques suaves
//   • Abertura: logo com anel dourado girando, veios de mármore animados, nome letra a letra,
//     barra de carregamento ligada ao carregamento real; some quando o app termina de carregar.
//     Completa só na 1ª abertura da sessão; depois (ou num recarregamento do app) é rápida.
//   • Sons sintetizados (sem arquivos): toque nos botões, troca de tela, sucesso, chegada.
//     Botão 🔊 no topo da tela inicial liga/desliga (fica salvo). Vibração curtinha no Android.
//   • Telas e cartões entram com animação.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__hrEntrada) return; window.__hrEntrada = true;

  // ── SONS ──────────────────────────────────────────────────────────
  var ctx = null, ultimoTap = 0, ultimaTela = 0;
  function ligado() { try { return localStorage.getItem('hr_sons') !== '0'; } catch (e) { return true; } }
  function ac() {
    if (!ctx) { try { var C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); } catch (e) {} }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function tom(freq, ini, dur, vol, tipo, ate) {
    var c = ac(); if (!c || c.state !== 'running') return;
    var t = c.currentTime + (ini || 0), o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sopro(dur, vol) { // "whoosh" de ruído filtrado
    var c = ac(); if (!c || c.state !== 'running') return;
    var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = b; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  var SOM = {
    tap: function () { if (!ligado() || Date.now() - ultimoTap < 60) return; ultimoTap = Date.now(); tom(1650, 0, 0.045, 0.035, 'sine', 1200); vib(6); },
    tela: function () { if (!ligado() || Date.now() - ultimaTela < 300) return; ultimaTela = Date.now(); sopro(0.22, 0.05); },
    sucesso: function () { if (!ligado()) return; tom(784, 0, 0.16, 0.05); tom(1175, 0.09, 0.26, 0.045); vib(12); },
    erro: function () { if (!ligado()) return; tom(330, 0, 0.18, 0.05, 'triangle'); tom(247, 0.12, 0.26, 0.05, 'triangle'); vib([20, 40, 20]); },
    chegada: function () { // sino suave: acorde dourado (mi – si – mi agudo) com harmônicos
      if (!ligado()) return;
      [[659.3, 0], [987.8, 0.11], [1318.5, 0.22]].forEach(function (n) { tom(n[0], n[1], 1.4, 0.045); tom(n[0] * 2.01, n[1], 0.7, 0.012); });
    },
    ligado: ligado,
    alternar: function () { var v = !ligado(); try { localStorage.setItem('hr_sons', v ? '1' : '0'); } catch (e) {} if (v) { ac(); SOM.sucesso(); } return v; },
  };
  function vib(p) { try { if (ligado() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  window.HRSom = SOM;

  // toque em botão → clique suave (o 1º toque também destrava o áudio do navegador)
  document.addEventListener('pointerdown', function (e) {
    ac();
    var el = e.target && e.target.closest && e.target.closest('button, .btn, [onclick], .sp2-q-btn, .sp-cat-btn, .tab, a, label, select, input[type=checkbox], input[type=radio]');
    if (el) SOM.tap();
  }, { passive: true, capture: true });

  // ── ABERTURA ──────────────────────────────────────────────────────
  var ov = document.getElementById('hrIntro'); if (!ov) return;
  var rapida = false; try { rapida = sessionStorage.getItem('hr_intro') === '1'; } catch (e) {}
  if (rapida) ov.classList.add('rapida');
  var t0 = Date.now(), MIN = rapida ? 350 : 2300, saiu = false;

  // saudação
  var h = new Date().getHours(), sd = document.getElementById('hrIntroSaud');
  if (sd) sd.textContent = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  // nome letra a letra
  var nm = document.getElementById('hrIntroNome');
  if (nm && !rapida) {
    var txt = nm.textContent; nm.textContent = '';
    for (var i = 0; i < txt.length; i++) { var sp = document.createElement('span'); sp.textContent = txt[i] === ' ' ? ' ' : txt[i]; sp.style.animationDelay = (0.55 + i * 0.045) + 's'; nm.appendChild(sp); }
  }

  // barra de progresso: anda sozinha até ~88% e completa quando o app termina de carregar
  var barra = document.getElementById('hrIntroBarra'), prog = 0, carregou = document.readyState === 'complete';
  var tick = setInterval(function () {
    var alvo = carregou ? 100 : 88;
    prog += (alvo - prog) * (carregou ? 0.35 : 0.06);
    if (barra) barra.style.transform = 'scaleX(' + (prog / 100).toFixed(3) + ')';
  }, 60);

  // veios de mármore e pó dourado
  var cv = document.getElementById('hrIntroCanvas'), raf = 0;
  if (cv && !rapida && cv.getContext) {
    var g = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var veios = [], po = [];
    var tamanho = function () { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    tamanho(); window.addEventListener('resize', tamanho);
    for (var v = 0; v < 7; v++) veios.push({ y: Math.random(), a: 0.04 + Math.random() * 0.08, f: 1 + Math.random() * 2.5, fase: Math.random() * 6, w: 0.5 + Math.random() * 1.6, vel: 0.15 + Math.random() * 0.3 });
    for (var p = 0; p < 46; p++) po.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.6, vy: 0.0006 + Math.random() * 0.0016, a: Math.random() });
    var desenhar = function (ts) {
      var t = ts / 1000; g.clearRect(0, 0, W, H);
      veios.forEach(function (vv) {
        g.beginPath();
        for (var x = 0; x <= W; x += 8) {
          var k = x / W, y = H * (vv.y + vv.a * Math.sin(k * Math.PI * vv.f + vv.fase + t * vv.vel) + 0.03 * Math.sin(k * 17 + t));
          if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        var gr = g.createLinearGradient(0, 0, W, 0);
        gr.addColorStop(0, 'rgba(201,168,76,0)'); gr.addColorStop(0.5, 'rgba(232,201,106,' + (0.16 + 0.1 * Math.sin(t + vv.fase)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(201,168,76,0)');
        g.strokeStyle = gr; g.lineWidth = vv.w; g.shadowColor = 'rgba(232,201,106,.5)'; g.shadowBlur = 8; g.stroke();
      });
      g.shadowBlur = 0;
      po.forEach(function (q) {
        q.y -= q.vy; if (q.y < -0.02) { q.y = 1.02; q.x = Math.random(); }
        var al = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.4 + q.a * 9));
        g.fillStyle = 'rgba(240,210,120,' + al.toFixed(2) + ')'; g.beginPath(); g.arc(q.x * W, q.y * H, q.r, 0, 6.283); g.fill();
      });
      if (!saiu) raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
  }

  function sair() {
    if (saiu) return;
    var falta = MIN - (Date.now() - t0);
    if (falta > 0) { setTimeout(sair, falta); return; }
    saiu = true; carregou = true;
    setTimeout(function () {
      clearInterval(tick);
      ov.classList.add('saindo');
      if (!rapida) SOM.chegada();
      try { sessionStorage.setItem('hr_intro', '1'); } catch (e) {}
      document.documentElement.classList.add('hr-entrou');
      setTimeout(function () { cancelAnimationFrame(raf); if (ov.parentNode) ov.parentNode.removeChild(ov); }, rapida ? 380 : 900);
      try { window.dispatchEvent(new Event('hr:entrou')); } catch (e) {}
    }, rapida ? 0 : 260);
  }
  if (carregou) sair(); else window.addEventListener('load', function () { carregou = true; sair(); });
  setTimeout(function () { carregou = true; sair(); }, 9000); // nunca prende o usuário na abertura
  ov.addEventListener('click', function () { ac(); if (Date.now() - t0 > 900) { MIN = 0; carregou = true; sair(); } });

  // ── DEPOIS DE ENTRAR: botão de som, troca de tela com som, sucesso nos avisos ──
  function depois() {
    var hdr = document.querySelector('.sp2-hdr');
    if (hdr && !document.getElementById('hrSomBt')) {
      var b = document.createElement('button'); b.id = 'hrSomBt'; b.type = 'button'; b.setAttribute('aria-label', 'Sons do app');
      var pinta = function () { b.textContent = SOM.ligado() ? '🔊' : '🔇'; };
      pinta(); b.onclick = function (e) { e.stopPropagation(); SOM.alternar(); pinta(); };
      hdr.appendChild(b);
    }
    if (typeof window.openApp === 'function' && !window.openApp.__som) { var o = window.openApp; window.openApp = function () { SOM.tela(); return o.apply(this, arguments); }; window.openApp.__som = true; }
    if (typeof window.voltarSplash === 'function' && !window.voltarSplash.__som) { var vs = window.voltarSplash; window.voltarSplash = function () { SOM.tela(); return vs.apply(this, arguments); }; window.voltarSplash.__som = true; }
    if (typeof window.go === 'function' && !window.go.__som) { var gg = window.go; window.go = function () { SOM.tela(); return gg.apply(this, arguments); }; window.go.__som = true; }
    if (typeof window.toast === 'function' && !window.toast.__som) {
      var tt = window.toast;
      window.toast = function (m) { var s = String(m || ''); if (/✓|✅|sucesso|salv|enviad|registrad|pronto/i.test(s)) SOM.sucesso(); else if (/⚠|❌|erro|falh|não (deu|foi|consegui)/i.test(s)) SOM.erro(); return tt.apply(this, arguments); };
      window.toast.__som = true;
    }
  }
  window.addEventListener('hr:entrou', function () { setTimeout(depois, 50); });
  window.addEventListener('load', function () { setTimeout(depois, 1500); });
})();
