// ══════════════════════════════════════════════════════════════════════════
// PATCH — app-import-relatorio.js
// Correções aplicadas:
//
//   BUG 2 (parte 1/2) — Exporta calcSaldoHE() para ser consumido pelo HR_FUNC
//     Função pura que recebe array de registros + dados do funcionário
//     e retorna o breakdown financeiro correto (HE50/100/200) usando
//     o classificador oficial _classificarHE.
//
//   BUG 3 — tipoExtra preenchido corretamente na importação
//     Ao salvar cada registro em _confirmarImportacao(), o campo
//     tipoExtra agora reflete a classificação real do dia:
//     'normal' → dia útil seg-sáb
//     'domingo' → domingo trabalhado
//     'feriado' → feriado
//     'especial' → dia especial (CFG.diasEspeciais)
//
//   BUG 1 — calcValorHoraReal() exportado
//     Calcula o valor/hora real com base na jornada configurada do
//     funcionário em vez de usar sempre 220h fixo.
//
// COMO APLICAR:
//   Localize as marcações "── PATCH:" no código original e substitua
//   os trechos indicados. Cada bloco abaixo é auto-contido e indica
//   exatamente o que entra e o que sai.
// ══════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════
// PATCH A — Substituição em _confirmarImportacao()
// Arquivo: app-import-relatorio.js
// Localizar: o objeto literal salvo em regs[id] = { ... }
//            que contém a linha: tipoExtra: 'normal',
//
// ANTES (linha ~1287):
//   tipoExtra: 'normal',
//
// DEPOIS: substitua toda a linha por:
//   tipoExtra: (function(){
//     var cls = _classificarHE({ data: r.data, extra: calc.extra });
//     if (cls.extra200 > 0) return 'especial';
//     if (cls.extra100 > 0) return (CFG.feriados && CFG.feriados.indexOf(r.data) >= 0) ? 'feriado' : 'domingo';
//     return 'normal';
//   }()),
// ══════════════════════════════════════════════════════════════════════════

// ── PATCH A — bloco de substituição (recorte limpo) ──────────────────────
// Copie o bloco abaixo para substituir a linha `tipoExtra: 'normal',`
// dentro do objeto regs[id] = { ... } em _confirmarImportacao():

/*
        tipoExtra: (function(){
          var cls = _classificarHE({ data: r.data, extra: calc.extra });
          if (cls.extra200 > 0) return 'especial';
          if (cls.extra100 > 0) return (CFG.feriados && CFG.feriados.indexOf(r.data) >= 0) ? 'feriado' : 'domingo';
          return 'normal';
        }()),
*/


// ══════════════════════════════════════════════════════════════════════════
// PATCH B — Nova função calcValorHoraReal()
// Arquivo: app-import-relatorio.js
// Localizar: a função _calcValorHE() (linha ~217)
// Inserir ANTES dela a função abaixo.
//
// Calcula o valor/hora real do funcionário considerando a jornada
// configurada (jornadaDiariaMin) em vez de sempre dividir por 220h CLT.
//
// Lógica:
//   1. Se o funcionário tem jornadaDiariaMin configurado:
//      - horas/dia = jornadaDiariaMin / 60
//      - horas/semana = horas/dia × 6 (seg–sáb), sendo sáb = metade
//        ou seja: (horas/dia × 5) + (horas/dia × 0.5) se jornada padrão
//      - Mas para simplificar e ser robusto: usa dias úteis do mês corrente
//        multiplicados pela jornada diária.
//   2. Se não há jornada configurada: fallback 220h (CLT padrão).
//   3. Exposto no return do módulo como calcValorHoraReal.
// ══════════════════════════════════════════════════════════════════════════

// ── PATCH B — nova função (inserir antes de _calcValorHE) ────────────────

/*
  /**
   * Calcula o valor/hora real de um funcionário com base na jornada
   * configurada, evitando distorção do divisor fixo 220h CLT.
   *
   * @param {Object} func   — objeto do funcionário (de _getFuncionarios())
   * @param {String} mesISO — "yyyy-mm" do mês de referência (padrão: mês atual)
   * @returns {Number} valor da hora em R$
   * /
  function _calcValorHoraReal(func, mesISO) {
    var salario = parseFloat((func && func.salario) || 0);
    if (!salario) return 0;

    // Jornada diária em minutos (customizada ou padrão 480min = 8h)
    var jornadaDiariaMin = (func && parseInt(func.jornadaDiariaMin)) || 0;

    if (jornadaDiariaMin > 0) {
      // Usa dias úteis do mês de referência para calcular horas/mês reais
      var ym = mesISO ? mesISO.slice(0, 7) : new Date().toISOString().slice(0, 7);
      var ano = parseInt(ym.slice(0, 4)), mes = parseInt(ym.slice(5, 7));
      var ultimoDia = new Date(ano, mes, 0).getDate();
      var diStr = ym + '-01';
      var dfStr = ym + '-' + String(ultimoDia).padStart(2, '0');

      // Conta dias úteis seg-sex e sábados separadamente
      var diasSemanais = 0, diasSab = 0;
      var d = new Date(diStr + 'T12:00:00');
      var fim = new Date(dfStr + 'T12:00:00');
      while (d <= fim) {
        var dow = d.getDay();
        if (dow === 6) diasSab++;
        else if (dow !== 0) diasSemanais++;
        d.setDate(d.getDate() + 1);
      }

      // Sábado tem jornada de 4h (240min) independente da jornada configurada
      // (a jornada customizada aplica-se aos dias seg-sex)
      var horasMes = (diasSemanais * jornadaDiariaMin + diasSab * 240) / 60;
      if (horasMes > 0) return salario / horasMes;
    }

    // Fallback CLT: 220h mensais
    return salario / 220;
  }
*/


// ══════════════════════════════════════════════════════════════════════════
// PATCH C — Nova função calcSaldoHE() — motor financeiro unificado
// Arquivo: app-import-relatorio.js
// Localizar: bloco de EXPORT no final do módulo (return { ... })
// Inserir a função abaixo ANTES do return, e adicionar ao return:
//   calcSaldoHE:      calcSaldoHE,
//   calcValorHoraReal: _calcValorHoraReal,
//
// Esta é a função que o HR_FUNC vai consumir para substituir
// o cálculo financeiro próprio e quebrado dele.
// ══════════════════════════════════════════════════════════════════════════

// ── PATCH C — nova função calcSaldoHE() (inserir antes do return) ────────

/*
  /**
   * Motor financeiro unificado de horas extras.
   * Substitui o cálculo interno do HR_FUNC, eliminando a inconsistência
   * entre o painel do funcionário e o relatório PDF.
   *
   * Recebe os registros já persistidos de um funcionário e o objeto
   * do funcionário, e retorna o breakdown financeiro correto com
   * classificação HE50/HE100/HE200.
   *
   * @param {Array}  registros  — array de registros do localStorage (hr_registros)
   *                              filtrados pelo funcionário e período desejado
   * @param {Object} func       — objeto do funcionário (de hr_funcionarios)
   * @param {String} mesISO     — "yyyy-mm" para cálculo do valor/hora real.
   *                              Se omitido, usa o mês do primeiro registro.
   * @returns {Object} {
   *   valorHoraBase,           — valor base R$/hora (jornada real ou 220h CLT)
   *   totalExtra50Min,         — minutos de HE 50% (dias úteis)
   *   totalExtra100Min,        — minutos de HE 100% (dom/feriado)
   *   totalExtra200Min,        — minutos de HE 200% (especial)
   *   valorExtra50,            — R$ HE 50%
   *   valorExtra100,           — R$ HE 100%
   *   valorExtra200,           — R$ HE 200%
   *   valorTotalExtras,        — R$ total extras (50+100+200)
   *   totalExtraHoras,         — total horas extras (todas faixas)
   * }
   * /
  function calcSaldoHE(registros, func, mesISO) {
    // Mes de referência: primeiro registro ou mês atual
    var refMes = mesISO ||
      (registros && registros.length > 0
        ? registros[0].data.slice(0, 7)
        : new Date().toISOString().slice(0, 7));

    var valorHoraBase = _calcValorHoraReal(func, refMes);

    var totalExtra50Min  = 0;
    var totalExtra100Min = 0;
    var totalExtra200Min = 0;

    (registros || []).forEach(function(r) {
      // Horas destinadas ao banco não entram no financeiro
      if (r.destinoExtra === 'banco') return;

      var extraHoras = parseFloat(r.extra) || 0;
      if (extraHoras <= 0) return;

      var extraMin = Math.round(extraHoras * 60);

      // Usa o tipoExtra persistido se disponível (Bug 3 corrigido),
      // com fallback para recalcular pela data (compatibilidade com
      // registros importados antes do patch).
      var tipo = r.tipoExtra || 'normal';

      if (tipo === 'especial') {
        totalExtra200Min += extraMin;
      } else if (tipo === 'feriado' || tipo === 'domingo') {
        totalExtra100Min += extraMin;
      } else {
        // 'normal' ou ausente: reclassifica pela data para garantir correção
        // (cobre registros antigos sem tipoExtra correto)
        var cls = _classificarHE({ data: r.data, extra: extraMin });
        totalExtra50Min  += cls.extra50;
        totalExtra100Min += cls.extra100;
        totalExtra200Min += cls.extra200;
      }
    });

    var valorExtra50  = _calcValorHE(totalExtra50Min,  CFG.he.normal,   valorHoraBase);
    var valorExtra100 = _calcValorHE(totalExtra100Min, CFG.he.domingo,  valorHoraBase);
    var valorExtra200 = _calcValorHE(totalExtra200Min, CFG.he.especial, valorHoraBase);
    var valorTotalExtras = valorExtra50 + valorExtra100 + valorExtra200;

    return {
      valorHoraBase:     valorHoraBase,
      totalExtra50Min:   totalExtra50Min,
      totalExtra100Min:  totalExtra100Min,
      totalExtra200Min:  totalExtra200Min,
      valorExtra50:      valorExtra50,
      valorExtra100:     valorExtra100,
      valorExtra200:     valorExtra200,
      valorTotalExtras:  valorTotalExtras,
      totalExtraHoras:   (totalExtra50Min + totalExtra100Min + totalExtra200Min) / 60
    };
  }
*/


// ══════════════════════════════════════════════════════════════════════════
// PATCH D — Atualização do return { ... } do módulo HR_IMPORT
// Arquivo: app-import-relatorio.js
// Localizar: o return { ... } no final do IIFE
// Adicionar as duas novas entradas abaixo das existentes.
// ══════════════════════════════════════════════════════════════════════════

// ── PATCH D — linhas a adicionar no return { ... } ───────────────────────

/*
    // Motor financeiro unificado — consumido pelo HR_FUNC (substitui cálculo paralelo)
    calcSaldoHE:          calcSaldoHE,
    calcValorHoraReal:    _calcValorHoraReal,
*/


// ══════════════════════════════════════════════════════════════════════════
// RESUMO DE APLICAÇÃO — na ordem exata:
//
//  1. Abra app-import-relatorio.js
//  2. Localize a linha `tipoExtra: 'normal',` dentro de _confirmarImportacao()
//     → Substitua pelo bloco do PATCH A
//  3. Localize a função _calcValorHE() (por volta da linha 217)
//     → Insira o PATCH B (função _calcValorHoraReal) ANTES dela
//  4. Localize o `return {` final do módulo
//     → Insira o PATCH C (função calcSaldoHE) ANTES do return
//  5. Dentro do return { ... }, adicione as linhas do PATCH D
//
// Depois de salvar, vá para app-funcionarios.patch.js e aplique
// as correções do HR_FUNC.
// ══════════════════════════════════════════════════════════════════════════
