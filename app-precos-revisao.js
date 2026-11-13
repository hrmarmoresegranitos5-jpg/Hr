// app-precos-revisao.js — v1 (13/11/2026): aplica UMA vez a revisão de preços aprovada pelo Sr. Hangel.
// Só troca um valor se ele ainda estiver igual ao antigo: preço que o senhor mudou à mão depois fica como está.
//   • Deslocamento fora da cidade: R$ 3,50 → R$ 5,00 por km (km de ida)
//   • Instalação de lavatório até 3 tubos: R$ 120 → R$ 180
//   • Instalação de balcão simples em cima de móvel: R$ 100 → R$ 150
//   • Cubas de lavatório com custo cadastrado: preço = custo + 35% (estava custo + 10%)
//   • Branco Prime e Café imperial: margem 40% → 50% (como as outras pedras)
// O teto de desconto (15% sobre o valor do projeto sem motivo escrito) está em app-core.js.
(function () {
  'use strict';
  var MARCA = '_precosRev20261113';

  function trocaSv(k, antigo, novo, rotulo) {
    if (!CFG.sv || +CFG.sv[k] !== antigo) return false;
    CFG.sv[k] = novo;
    (CFG.svList || []).forEach(function (x) { if (x.k === k) { x.preco = novo; if (rotulo) x.l = rotulo; } });
    return true;
  }
  function trocaSvPorNome(re, antigo, novo) {
    var it = (CFG.svList || []).find(function (x) { return re.test(String(x.l || '')) && +x.preco === antigo; });
    if (!it) return false;
    it.preco = novo; if (CFG.sv) CFG.sv[it.k] = novo;
    return true;
  }

  function aplicar() {
    if (typeof CFG === 'undefined' || !CFG || !CFG.sv || CFG[MARCA]) return;
    var n = 0;
    if (trocaSv('desl_for', 3.5, 5, 'Deslocamento fora da cidade (por km de ida)')) n++;
    if (trocaSvPorNome(/lavat[oó]rio at[eé] 3 tubos/i, 120, 180)) n++;
    if (trocaSvPorNome(/balc[aã]o simples/i, 100, 150)) n++;

    (CFG.lav || []).forEach(function (c) {
      var custo = +c.custo || 0, pr = +c.pr || 0;
      if (custo > 0 && pr > 0 && pr < custo * 1.2) { c.pr = Math.round(custo * 1.35); n++; }
    });

    (CFG.stones || []).forEach(function (s) {
      var nm = String(s.nm || '').trim().toLowerCase();
      if ((nm === 'branco prime' || nm === 'café imperial' || nm === 'cafe imperial') && +s.margem === 40 && +s.custo > 0) {
        var ct = ((+s.custo) + (+s.frete || 0)) * (1 + ((s.perda != null ? +s.perda : 10) / 100));
        s.margem = 50; s.pr = Math.round(ct / 0.5 * 100) / 100; n++;
      }
    });

    CFG[MARCA] = true;
    try { if (typeof svCFG === 'function') svCFG(); else localStorage.setItem('hr_cfg', JSON.stringify(CFG)); } catch (e) {}
    try { if (typeof buildMat === 'function') buildMat(); } catch (e) {}
    if (n && typeof toast === 'function') setTimeout(function () { toast('✓ Tabela de preços revisada (' + n + ' itens atualizados)'); }, 1500);
  }

  // roda depois do carregamento e de novo mais tarde (cobre a configuração que chega da nuvem)
  setTimeout(aplicar, 1500);
  setTimeout(aplicar, 8000);
  window.addEventListener('load', function () { setTimeout(aplicar, 3000); });
})();
