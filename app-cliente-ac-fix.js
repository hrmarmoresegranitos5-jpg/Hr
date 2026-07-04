// ══════════════════════════════════════════════════════════
// 🩹 CORREÇÃO — Autocomplete de Cliente (seleção errada / trava)
// v2 — corrige a trava de verdade (v1 só tinha efeito parcial)
//
// Problema 1: ao tocar num nome sugerido, às vezes preenche um
// cliente DIFERENTE do que aparecia na tela.
//
// Problema 2: a tela "trava" ao digitar/selecionar no campo Cliente.
//
// Causa raiz dos dois: o app-cliente-perfil.js registra a função
// _posicionarACDrop DIRETO nos eventos de scroll/resize/teclado
// (window.addEventListener('scroll', _posicionarACDrop...)). Ela
// faz getBoundingClientRect() + muda estilo a cada chamada — isso
// força o navegador a recalcular o layout da página inteira.
//
// Durante a animação do teclado abrindo/fechando, esses eventos
// disparam MUITAS vezes por segundo. Cada disparo força um recálculo
// de layout. Em sequência rápida, isso é pesado o suficiente pra
// travar a tela por um instante — e como a lista se desloca no meio
// do processo, o toque às vezes acerta a linha errada.
//
// A v1 deste patch trocava window._posicionarACDrop por uma versão
// com throttle, mas os listeners de scroll/resize já tinham sido
// registrados com a função ORIGINAL (referência direta) — trocar
// a propriedade window._posicionarACDrop depois não afeta quem já
// guardou essa referência. Por isso a trava continuou.
//
// Esta versão remove os listeners antigos (crus) e os substitui
// pela versão com throttle (no máx. 1x por frame de tela via
// requestAnimationFrame) — agora sim resolve a tempestade de
// recálculos de layout.
//
// Carregar DEPOIS de app-cliente-perfil.js.
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var _acTravado = false;
  var _rafPendente = false;
  var _original = null;

  function _extrairId(el) {
    var attr = el.getAttribute('onmousedown') || '';
    var m = attr.match(/cliACSelecionar\((\d+)\)/);
    return m ? +m[1] : null;
  }

  function _throttled() {
    if (_acTravado) return;
    if (_rafPendente) return;
    _rafPendente = true;
    requestAnimationFrame(function() {
      _rafPendente = false;
      if (_acTravado) return;
      if (typeof _original === 'function') _original();
    });
  }

  function _instalarTrava() {
    if (typeof window._posicionarACDrop !== 'function') return;
    if (window._acFixV2Instalado) return; // evita instalar duas vezes
    window._acFixV2Instalado = true;

    _original = window._posicionarACDrop;

    // Remove os listeners CRUS que o app-cliente-perfil.js registrou
    // direto na função original (é por isso que a v1 não resolvia).
    window.removeEventListener('scroll', _original, true);
    window.removeEventListener('resize', _original);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', _original);
      window.visualViewport.removeEventListener('scroll', _original);
    }
    var inp = document.getElementById('oCliente');
    if (inp) {
      inp.removeEventListener('focus', _original);
      inp.removeEventListener('input', _original);
    }

    // Reinstala com a versão "throttled" — no máximo 1 execução
    // por frame de tela, mesmo que o evento dispare 50x.
    window._posicionarACDrop = _throttled;
    window.addEventListener('scroll', _throttled, true);
    window.addEventListener('resize', _throttled);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', _throttled);
      window.visualViewport.addEventListener('scroll', _throttled);
    }
    if (inp) {
      inp.addEventListener('focus', _throttled);
      inp.addEventListener('input', _throttled);
    }
  }

  // ── Captura o toque na fase de CAPTURA (antes de blur/scroll/resize) ──
  document.addEventListener('pointerdown', function(e) {
    var linha = e.target.closest && e.target.closest('#cliACDrop .cliaci');
    if (!linha) return;

    _acTravado = true;
    var id = _extrairId(linha);

    e.preventDefault();
    e.stopPropagation();

    if (id != null && typeof window.cliACSelecionar === 'function') {
      window.cliACSelecionar(id);
    }

    setTimeout(function() { _acTravado = false; }, 350);
  }, true);

  // ── Fechar a lista ao tocar fora dela ──
  document.addEventListener('pointerdown', function(e) {
    var dd = document.getElementById('cliACDrop');
    var inp = document.getElementById('oCliente');
    if (!dd || dd.style.display === 'none') return;
    var dentro = (e.target.closest && (e.target.closest('#cliACDrop') || e.target.closest('#oCliente')));
    if (!dentro) dd.style.display = 'none';
  }, true);

  // Tenta instalar agora e também com pequenos atrasos, caso
  // app-cliente-perfil.js ainda não tenha rodado seu _onReady
  // (que é quando ele registra os listeners originais) no exato
  // momento em que este script executa.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      _instalarTrava();
      setTimeout(_instalarTrava, 300);
      setTimeout(_instalarTrava, 1000);
    });
  } else {
    _instalarTrava();
    setTimeout(_instalarTrava, 300);
    setTimeout(_instalarTrava, 1000);
  }
})();
