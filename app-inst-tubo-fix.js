// ══════════════════════════════════════════════════════════
// 🔧 INSTALAÇÃO POR TUBO — HR Mármores e Granitos
//
// Remove o valor FIXO de "Instalação Padrão" / "Instalação Complexa"
// e troca por um campo de quantidade: o vendedor informa quantos
// tubos/conexões o serviço tem, e o valor é (qtd de tubos) × (preço
// por tubo, configurável em Configurações).
//
// Afeta os ambientes: Cozinha, Banheiro, Lavabo (e "Outro", que usa
// a mesma tabela da Cozinha), Túmulo e Capela (⛪).
// NÃO mexe em Soleira, Peitoril, Escada, Fachada, Balcão, Divisória
// WC, Borda de Piscina ou Rodapé de Box — esses continuam com
// Instalação Padrão/Complexa de valor fixo, como já estava.
//
// Preço por tubo:
//   - Cozinha/Banheiro/Lavabo/Outro compartilham UM preço só: 'inst_tubo'
//   - Túmulo usa 'tum_tubo' (preço próprio)
//   - Capela usa 'cap_tubo' (preço próprio)
//   Todos aparecem editáveis em Configurações → Serviços.
//
// Não altera nenhum arquivo existente. Carregar DEPOIS de app-core.js
// no index.html (pode ficar antes ou depois de app-instalacao-ia.js):
//   <script src="app-inst-tubo-fix.js?v=1"></script>
//
// ⚠️ Nota: a aba legada "Configurações → Capelinhas" (tab 8) tem sua
// própria lógica interna de sincronização. Se um dia você abrir essa
// aba e clicar em "Salvar Configurações" SEM antes remover manualmente
// os campos antigos de Montagem/Instalação Complexa que reaparecerem
// lá, eles podem voltar temporariamente — mas este patch roda de novo
// a cada carregamento da página e corrige a tela de Capela outra vez.
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var PRECO_PADRAO_TUBO = 90; // R$ por tubo/conexão — ajuste em Configurações depois

  // ── Troca o grupo "Instalação" (Cozinha/Banheiro/Lavabo) por 1 item de qtd ──
  function _trocarInstalacaoPorTubo(grupos, chaveNova) {
    if (!grupos) return;
    grupos.forEach(function(grp) {
      if (grp.g !== 'Instalação') return;
      var temAntigo = grp.its.some(function(it) { return it.k === 'inst' || it.k === 'inst_c'; });
      if (!temAntigo && grp.its.length === 1 && grp.its[0].k === chaveNova) return; // já aplicado
      grp.its = [{ k: chaveNova, l: 'Instalação (por tubo/conexão)', u: 'un', fx: 0 }];
    });
  }

  // ── Troca "Montagem/Instalação" + "Instalação Complexa" por 1 item de qtd,
  //     preservando outros itens do grupo (ex: Recorte/Furo) ──
  function _trocarMaoDeObraPorTubo(grupos, chaveVelha1, chaveVelha2, chaveNova) {
    if (!grupos) return;
    grupos.forEach(function(grp) {
      var achou = grp.its.some(function(it) { return it.k === chaveVelha1 || it.k === chaveVelha2; });
      if (!achou) return;
      var resto = grp.its.filter(function(it) { return it.k !== chaveVelha1 && it.k !== chaveVelha2 && it.k !== chaveNova; });
      grp.its = [{ k: chaveNova, l: 'Instalação (por tubo/conexão)', u: 'un', fx: 0 }].concat(resto);
    });
  }

  // ── Garante o preço no CFG.sv e no CFG.svList (aba Configurações → Serviços) ──
  function _garantirPreco(k, label, grupo) {
    if (!window.CFG) return;
    if (!CFG.sv) CFG.sv = {};
    if (CFG.sv[k] === undefined || CFG.sv[k] === null) CFG.sv[k] = PRECO_PADRAO_TUBO;
    if (!CFG.svList) CFG.svList = [];
    if (!CFG.svList.find(function(x) { return x.k === k; })) {
      CFG.svList.push({ k: k, l: label, preco: CFG.sv[k], grp: grupo, u: 'un' });
      if (typeof svCFG === 'function') svCFG();
    }
  }

  function aplicarPatch() {
    if (typeof SV_DEFS === 'undefined') return false;

    ['Cozinha', 'Banheiro', 'Lavabo'].forEach(function(tipo) {
      if (SV_DEFS[tipo]) _trocarInstalacaoPorTubo(SV_DEFS[tipo], 'inst_tubo');
    });
    // "Outro" = mesma referência de SV_DEFS.Cozinha, já é corrigido junto.

    if (SV_DEFS.Tumulo) _trocarMaoDeObraPorTubo(SV_DEFS.Tumulo, 'tum_mont', 'tum_montc', 'tum_tubo');
    if (SV_DEFS.Capela) _trocarMaoDeObraPorTubo(SV_DEFS.Capela, 'cap_mont', 'cap_montc', 'cap_tubo');

    _garantirPreco('inst_tubo', 'Instalação (por tubo/conexão) — Cozinha/Banheiro/Lavabo', 'Instalação');
    _garantirPreco('tum_tubo', 'Instalação Túmulo (por tubo/conexão)', 'Túmulo / Capela');
    _garantirPreco('cap_tubo', 'Instalação Capela (por tubo/conexão)', 'Túmulo / Capela');

    return true;
  }

  if (!aplicarPatch()) {
    document.addEventListener('DOMContentLoaded', function() { aplicarPatch(); });
  }
  // Reaplica algumas vezes — cobre o caso de scripts assíncronos (ex: aba
  // legada de Capelinhas) que possam recriar os grupos depois do load inicial.
  setTimeout(aplicarPatch, 300);
  setTimeout(aplicarPatch, 1200);
  window.addEventListener('load', function() { setTimeout(aplicarPatch, 200); });
})();
