// ═══════════════════════════════════════════════════════════════════
// PATCH IEO — Tabela de pesos por categoria (versão proporcional)
// Adicionar no final de data-defaults.js (após var DEF_FIXOS = [...])
// Zero quebra — apenas nova constante global
// ═══════════════════════════════════════════════════════════════════

// Âncora: 1 m² de bancada simples = 1 ponto de produção (IEO).
//
// Cada categoria tem:
//   base    : pontos base fixos (esforço mínimo independente do m²)
//   ppm2    : pontos por m² adicional
//   oficina : proporção do IEO total que vai para oficina (0–1)
//   campo   : proporção do IEO total que vai para campo   (0–1)
//   geral   : proporção do IEO total que vai para geral   (0–1)
//
// REGRA: oficina + campo + geral === 1.0 em cada categoria.
//
// Calibração: ajuste as proporções a qualquer momento sem alterar código.

var _IEO_CAT = {
  // ── Cozinha ──────────────────────────────────────────────────────
  // Corte/borda/polimento → oficina | instalação em obra → campo
  'Cozinha'    : { base: 0,   ppm2: 1.0,  oficina: 0.40, campo: 0.35, geral: 0.25 },

  // ── Banheiro / Lavabo ─────────────────────────────────────────────
  'Banheiro'   : { base: 0,   ppm2: 1.1,  oficina: 0.45, campo: 0.30, geral: 0.25 },
  'Lavabo'     : { base: 0,   ppm2: 1.1,  oficina: 0.45, campo: 0.30, geral: 0.25 },

  // ── Cuba ──────────────────────────────────────────────────────────
  // Escavação/acabamento interno → quase tudo em oficina
  'Cuba'       : { base: 2.5, ppm2: 0.5,  oficina: 0.70, campo: 0.10, geral: 0.20 },

  // ── Rebaixo americano ─────────────────────────────────────────────
  'Rebaixo'    : { base: 3.0, ppm2: 0.3,  oficina: 0.75, campo: 0.10, geral: 0.15 },

  // ── Instalação (serviço puro de campo) ───────────────────────────
  'Instalação' : { base: 1.5, ppm2: 0.8,  oficina: 0.05, campo: 0.85, geral: 0.10 },

  // ── Escada ───────────────────────────────────────────────────────
  'Escada'     : { base: 1.0, ppm2: 1.3,  oficina: 0.35, campo: 0.50, geral: 0.15 },

  // ── Soleira / Peitoril ───────────────────────────────────────────
  'Soleira'    : { base: 0.5, ppm2: 1.0,  oficina: 0.25, campo: 0.55, geral: 0.20 },
  'Peitoril'   : { base: 0.5, ppm2: 0.9,  oficina: 0.25, campo: 0.55, geral: 0.20 },

  // ── Fachada ───────────────────────────────────────────────────────
  'Fachada'    : { base: 0.5, ppm2: 1.2,  oficina: 0.30, campo: 0.55, geral: 0.15 },

  // ── Funerário ────────────────────────────────────────────────────
  'Lápide'     : { base: 4.0, ppm2: 0.4,  oficina: 0.40, campo: 0.50, geral: 0.10 },
  'Cruzeiro'   : { base: 3.5, ppm2: 0.3,  oficina: 0.25, campo: 0.65, geral: 0.10 },
  'Capelinha'  : { base: 2.0, ppm2: 1.0,  oficina: 0.35, campo: 0.50, geral: 0.15 },
  'Túmulo'     : { base: 3.0, ppm2: 0.8,  oficina: 0.35, campo: 0.55, geral: 0.10 },
  'Funerário'  : { base: 3.0, ppm2: 0.6,  oficina: 0.35, campo: 0.55, geral: 0.10 },

  // ── Mesa / Tampo ─────────────────────────────────────────────────
  'Mesa'       : { base: 0,   ppm2: 1.0,  oficina: 0.50, campo: 0.25, geral: 0.25 },
  'Tampo'      : { base: 0,   ppm2: 1.0,  oficina: 0.50, campo: 0.25, geral: 0.25 },

  // ── Rodapé ───────────────────────────────────────────────────────
  'Rodapé'     : { base: 0,   ppm2: 0.8,  oficina: 0.30, campo: 0.45, geral: 0.25 },

  // ── Outro / fallback ─────────────────────────────────────────────
  'Outro'      : { base: 0.5, ppm2: 1.0,  oficina: 0.33, campo: 0.34, geral: 0.33 }
};

// Estimativa de IEO para um job ainda não salvo.
// Recebe o objeto job (precisa de .cat e .m2).
// Retorna { ieo, ieo_of, ieo_ca, ieo_ge } — prontos para somar ao calcSemana.
// Função pura: sem side effects, sem UI, sem salvar nada.
//
// Garantia matemática: ieo_of + ieo_ca + ieo_ge === ieo sempre.
// ieo_ge é calculado como resíduo para absorver erros de arredondamento.
function estimaIEO(job) {
  var cat = (job && job.cat)     || 'Outro';
  var m2  = (job && job.m2 > 0) ? job.m2 : 1; // mínimo 1 se m2 zerado

  // Busca exata na tabela
  var peso = _IEO_CAT[cat];

  // Match parcial: "Banheiro — Preto São Gabriel" → "Banheiro"
  if (!peso) {
    var catKey = Object.keys(_IEO_CAT).find(function(k) {
      return cat.toLowerCase().indexOf(k.toLowerCase()) >= 0;
    });
    peso = catKey ? _IEO_CAT[catKey] : _IEO_CAT['Outro'];
  }

  var ieo    = Math.round((peso.base + peso.ppm2 * m2) * 10) / 10;
  var ieo_of = Math.round(ieo * peso.oficina * 10) / 10;
  var ieo_ca = Math.round(ieo * peso.campo   * 10) / 10;
  // Resíduo garante: ieo_of + ieo_ca + ieo_ge === ieo
  var ieo_ge = Math.round((ieo - ieo_of - ieo_ca) * 10) / 10;

  return { ieo: ieo, ieo_of: ieo_of, ieo_ca: ieo_ca, ieo_ge: ieo_ge };
}
