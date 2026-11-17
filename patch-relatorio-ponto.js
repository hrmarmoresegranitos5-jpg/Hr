// ══════════════════════════════════════════════════════════════
// PATCH: corrige _gerarRelatorioPonto para período decendial
// ── DESATIVADO (12/07/2026) ──
//
// A correção que este patch tentava aplicar (respeitar o decêndio/mês
// selecionado na tela, em vez de sempre usar a data de hoje) foi
// implementada diretamente dentro de app-funcionarios.js, na própria
// função _gerarRelatorioPonto().
//
// Motivo da mudança: este patch dependia de window._folhaMes, uma
// variável global que só é setada ao navegar pela tela de Folha —
// ficando desatualizada (ou nunca setada) quando o modal de pagamento
// era aberto direto pelo cartão do funcionário. A versão nova lê o
// campo de Data (#pag_data) do próprio modal, que os botões de
// decêndio e a edição manual da data já mantêm sempre sincronizado
// com o que está visível na tela — eliminando essa fonte de
// divergência.
//
// Este arquivo foi deixado como um no-op (em vez de excluído) para
// não quebrar o <script src="patch-relatorio-ponto.js"> caso a tag
// ainda não tenha sido removida do index.html. Pode ser apagado com
// segurança — junto da linha correspondente no index.html — assim
// que a atualização for confirmada em produção.
// ══════════════════════════════════════════════════════════════

console.log('[PATCH] patch-relatorio-ponto.js: desativado — lógica migrada para app-funcionarios.js (_gerarRelatorioPonto).');
