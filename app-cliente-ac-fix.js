// ══════════════════════════════════════════════════════════
// 🩹 CORREÇÃO — Autocomplete de Cliente (seleção errada / trava)
//
// Problema relatado: ao tocar num nome sugerido no campo Cliente,
// às vezes preenche um cliente DIFERENTE do que aparecia na tela.
//
// Causa: o dropdown (#cliACDrop) se reposiciona sozinho quando o
// teclado virtual começa a fechar (usando visualViewport.resize).
// Isso pode acontecer bem entre o "mousedown" e o "click" do seu
// toque — a lista desliza pra um novo lugar e seu dedo, que estava
// certo no momento do toque, acaba "acertando" outra linha quando
// o navegador finalmente calcula o clique.
//
// Correção: capturar o toque o mais cedo possível (fase de captura,
// antes de blur/scroll/resize rodarem) e travar o reposicionamento
// da lista por um instante durante o toque.
//
// Carregar DEPOIS de app-cliente-perfil.js.
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var _acTravado = false;

  function _extrairId(el) {
    // O id do cliente está embutido no atributo onmousedown="...cliACSelecionar(123)"
    var attr = el.getAttribute('onmousedown') || '';
    var m = attr.match(/cliACSelecionar\((\d+)\)/);
    return m ? +m[1] : null;
  }

  // ── Congela o reposicionamento da lista durante um toque ──
  // (a função original continua existindo; aqui só filtramos as chamadas
  // automáticas de scroll/resize/visualViewport enquanto _acTravado=true)
  function _instalarTrava() {
    if (typeof window._posicionarACDrop !== 'function') return;
    var original = window._posicionarACDrop;
    window._posicionarACDrop = function() {
      if (_acTravado) return;
      return original.apply(this, arguments);
    };
  }

  // ── Captura o toque na fase de CAPTURA (antes de qualquer blur,
  //    scroll ou resize da lista poder rodar) ──
  document.addEventListener('pointerdown', function(e) {
    var linha = e.target.closest && e.target.closest('#cliACDrop .cliaci');
    if (!linha) return;

    _acTravado = true; // congela a lista até a seleção terminar
    var id = _extrairId(linha);

    e.preventDefault();
    e.stopPropagation();

    if (id != null && typeof window.cliACSelecionar === 'function') {
      window.cliACSelecionar(id);
    }

    setTimeout(function() { _acTravado = false; }, 350);
  }, true); // true = fase de captura, roda antes de tudo

  // ── Fechar a lista ao tocar fora dela (substitui a dependência
  //    só do blur+timeout, que é onde a corrida de tempo acontecia) ──
  document.addEventListener('pointerdown', function(e) {
    var dd = document.getElementById('cliACDrop');
    var inp = document.getElementById('oCliente');
    if (!dd || dd.style.display === 'none') return;
    var dentro = (e.target.closest && (e.target.closest('#cliACDrop') || e.target.closest('#oCliente')));
    if (!dentro) dd.style.display = 'none';
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _instalarTrava);
  } else {
    _instalarTrava();
  }
})();
