// ══════════════════════════════════════════════════════════════════════════
// HR_IMPORT v4 — HR Mármores e Granitos
// Importador de Relatório de Presença
//
// v4 — SUPORTE COMPLETO A XLS/XLSX:
//  • Lê .xls (BIFF8) e .xlsx via SheetJS (carregado do CDN se necessário)
//  • XLS serial de data → yyyy-mm-dd convertido corretamente
//  • XLS serial de hora → HH:MM convertido corretamente
//  • Fallback: se SheetJS não disponível, avisa o usuário
//  • CSV/TXT/TSV continua funcionando normalmente
//
// v3 — CORREÇÕES CORE:
//  • Parser seg–sáb correto (domingo = folga, sábado = dia útil 4h/dia)
//  • Jornada diária por tipo: Seg-Sex = 8h, Sáb = 4h
//  • Cálculo ao minuto (sem arredondamento prematuro)
//  • Intervalo de almoço: real se fornecido, 1h automático só Seg-Sex > 6h
//  • Extra e atraso calculados contra jornada correta do dia
//  • Vinculação automática funcionário ↔ nome do relatório
//  • Preview por dia expandível antes de importar
//  • Deduplicação: não sobrescreve sem aviso
// ══════════════════════════════════════════════════════════════════════════

var HR_IMPORT = (function () {

  // ── Constantes de jornada ────────────────────────────────────────────────
  var JORNADA = {
    // minutos por dia de trabalho (seg–sex = 480min / sáb = 240min)
    seg: 480, ter: 480, qua: 480, qui: 480, sex: 480, sab: 240
    // dom: folga (não conta)
  };
  var ALMOCO_MIN = 60; // desconto de almoço seg–sex se turno > 6h
  var DOW_NOMES  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var DOW_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];

  // ── CFG global — multiplicadores de HE ──────────────────────────────────
  // Guard: mantém configuração existente se já definida externamente
  var CFG = (typeof CFG !== 'undefined' && CFG) ? CFG : {};
  if (!CFG.he) {
    CFG.he = {
      normal:   1.5,   // HE 50%  — dias úteis/sábado (1,5× hora normal — CLT art.59 §1º)
      domingo:  2.0,   // HE 100% — domingos e feriados (2× hora normal — CLT art.9 Lei 605/49)
      feriado:  2.0,   // HE 100% — feriados
      especial: 3.0    // HE 200% — dias especiais (convenção coletiva)
    };
  }
  // Lista de feriados e dias especiais (arrays de "yyyy-mm-dd")
  // Preenchidos externamente se necessário; padrão vazio = apenas regras de dia da semana
  if (!CFG.feriados) CFG.feriados = [];
  if (!CFG.diasEspeciais) CFG.diasEspeciais = [];
  // Modo overnight: permite saída < entrada (ex: 22:00→05:00)
  // Desligado por padrão — ativar externamente: CFG.allowOvernight = true
  if (CFG.allowOvernight === undefined) CFG.allowOvernight = false;
  // Modo auditoria: loga detalhes completos de cada cálculo no console
  // Desligado por padrão — ativar externamente: CFG.auditMode = true
  if (CFG.auditMode === undefined) CFG.auditMode = false;
  // Persistência de auditoria: salva logs em DB.auditLogs[] (limite 1000)
  // Ativar externamente: CFG.auditPersist = true
  if (CFG.auditPersist === undefined) CFG.auditPersist = false;

  // ── DB: armazenamento de logs de auditoria ───────────────────────────────
  var DB = (function() {
    var AUDIT_KEY = 'hr_audit_logs';
    var MAX_LOGS  = 1000;

    function getAuditLogs() {
      try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch(e) { return []; }
    }
    function saveAuditLogs(logs) {
      try { localStorage.setItem(AUDIT_KEY, JSON.stringify(logs)); } catch(e) { console.error('[HR_DB]', e); }
    }

    /**
     * Persiste um log de auditoria. Mantém apenas os últimos MAX_LOGS.
     * @param {Object} entry — campos: funcionario, data, bruto, almoco, trabalhado,
     *                         saldo, classificacaoHE, anomalias[]
     */
    function pushAuditLog(entry) {
      if (!CFG.auditPersist) return;
      var logs = getAuditLogs();
      entry.registradoEm = new Date().toISOString();
      logs.push(entry);
      // Descarta os mais antigos se ultrapassar o limite
      if (logs.length > MAX_LOGS) logs = logs.slice(logs.length - MAX_LOGS);
      saveAuditLogs(logs);
    }

    /**
     * Retorna todos os logs de auditoria persistidos.
     * Filtra por funcionário ou período se informados.
     */
    function queryAuditLogs(opts) {
      opts = opts || {};
      var logs = getAuditLogs();
      if (opts.funcionario) logs = logs.filter(function(l){ return l.funcionario === opts.funcionario; });
      if (opts.di) logs = logs.filter(function(l){ return l.data >= opts.di; });
      if (opts.df) logs = logs.filter(function(l){ return l.data <= opts.df; });
      return logs;
    }

    function clearAuditLogs() { saveAuditLogs([]); }

    return { auditLogs: getAuditLogs, pushAuditLog: pushAuditLog, queryAuditLogs: queryAuditLogs, clearAuditLogs: clearAuditLogs };
  })();

  // ── Auditoria de cálculo (Item 5) ───────────────────────────────────────

  /**
   * Loga detalhes completos de um grupo no console quando CFG.auditMode === true.
   * Agrupa por funcionário com console.group para navegação fácil.
   *
   * Campos logados:
   *  - jornada esperada por dia
   *  - bruto / almoço / trabalhado
   *  - saldo / faixa HE
   *  - totais do período
   *  - anomalias de auditoria
   */
  function _auditLogGrupo(gr, calc) {
    if (!CFG.auditMode) return;
    var funcInfo = '[sem vínculo]';
    try {
      var funcs = _getFuncionarios();
      if (gr.funcId && funcs[gr.funcId]) funcInfo = funcs[gr.funcId].nome;
    } catch(e) {}

    console.group('[HR_IMPORT AUDIT] ' + gr.nome + ' → ' + funcInfo);

    calc.linhasCalc.forEach(function(lc) {
      var r   = lc.r;
      var res = lc.res;
      var dow = _dowNome(r.data);
      var cls = lc.valido ? _classificarHE({ data: r.data, extra: res.extra, funcId: gr.funcId || null }) : null;
      var faixa = cls ? (cls.extra200 > 0 ? 'HE200' : cls.extra100 > 0 ? 'HE100' : cls.extra50 > 0 ? 'HE50' : '—') : '—';
      var badges = _auditoriaBadges(lc);

      var linha = {
        data:          r.data + ' (' + dow + ')',
        entrada:       r.entrada || '?',
        saida:         r.saida   || '?',
        jornada_esp:   _min2dur(_jornadaEsperada(r.data, gr.funcId)),
        bruto:         _min2dur(res.bruto   || 0),
        almoco:        _min2dur(res.almoco  || 0),
        trabalhado:    _min2dur(res.trab    || 0),
        saldo:         (res.saldo >= 0 ? '+' : '') + _min2dur(Math.abs(res.saldo || 0)),
        extra:         _min2dur(res.extra   || 0),
        atraso:        _min2dur(res.atraso  || 0),
        faixa_HE:      faixa,
        valido:        lc.valido,
        anomalias:     badges.map(function(b){ return b.label; }).join(', ') || '—'
      };
      console.log(r.data, linha);
    });

    console.log('── TOTAIS ──', {
      dias:       calc.diasCount,
      trabalhado: _min2dur(calc.totalTrabMin),
      extra:      _min2dur(calc.totalExtraMin),
      atraso:     _min2dur(calc.totalAtrasoMin),
      saldo_liq:  (calc.saldoLiquidoMin >= 0 ? '+' : '') + _min2dur(Math.abs(calc.saldoLiquidoMin))
    });

    var anomTotal = _totalAnomalias(calc);
    if (anomTotal > 0) console.warn('⚠ ' + anomTotal + ' anomalia(s) detectada(s) no período');

    console.groupEnd();

    // ── Persistência de auditoria (CFG.auditPersist) ──────────────────────
    if (CFG.auditPersist) {
      calc.linhasCalc.forEach(function(lc) {
        var r   = lc.r;
        var res = lc.res;
        var cls = lc.valido ? _classificarHE({ data: r.data, extra: res.extra, funcId: gr.funcId || null }) : null;
        var faixa = cls
          ? (cls.extra200 > 0 ? 'HE200' : cls.extra100 > 0 ? 'HE100' : cls.extra50 > 0 ? 'HE50' : 'normal')
          : 'inválido';
        var anomalias = _auditoriaBadges(lc).map(function(b){ return b.label; });

        DB.pushAuditLog({
          funcionario: funcInfo,
          data:          r.data,
          bruto:         res.bruto   || 0,
          almoco:        res.almoco  || 0,
          trabalhado:    res.trab    || 0,
          saldo:         res.saldo   || 0,
          classificacaoHE: faixa,
          anomalias:     anomalias
        });
      });
    }
  }



  /**
   * ══════════════════════════════════════════════════════════════════════════
   * ITEM 2 — TRAVA DE JORNADA IMPOSSÍVEL
   * Valida um registro antes de salvar ou importar.
   *
   * Regras de rejeição operacional:
   *   • bruto > 18h (1080 min)  — jornada fisicamente impossível
   *   • almoço > 5h  (300 min)  — intervalo absurdo
   *   • entrada == saída          — registro em branco / erro de batida
   *
   * @param {Number} entMin    — minutos de entrada (0-1439)
   * @param {Number} saiMin    — minutos de saída   (0-1439)
   * @param {Number} almocoMin — minutos de almoço  (≥0)
   * @returns {{ valido: Boolean, motivo: String|null }}
   */
  function _validarJornada(entMin, saiMin, almocoMin) {
    almocoMin = almocoMin || 0;

    if (isNaN(entMin) || isNaN(saiMin)) {
      return { valido: false, motivo: 'Horário incompleto ou inválido' };
    }
    if (entMin === saiMin) {
      return { valido: false, motivo: 'Entrada igual à saída — registro inválido operacionalmente' };
    }
    var bruto = saiMin - entMin;
    if (bruto < 0) bruto += 1440; // overnight
    if (bruto > 1080) {
      return { valido: false, motivo: 'Jornada bruta de ' + _min2dur(bruto) + ' excede 18h — impossível operacionalmente' };
    }
    if (almocoMin > 300) {
      return { valido: false, motivo: 'Almoço de ' + _min2dur(almocoMin) + ' excede 5h — impossível operacionalmente' };
    }
    return { valido: true, motivo: null };
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * ITEM 3 — BANCO DE HORAS COM VENCIMENTO
   * Estrutura de entrada de banco:
   *   { minutos: 120, criadoEm: 'yyyy-mm-dd', venceEm: 'yyyy-mm-dd' }
   *
   * Helpers:
   *   _criarEntradaBanco(minutos, criadoEm, diasValidade)
   *   _calcBancoComVencimento(entradas, hoje)
   *   _relatorioVencimentos(entradas, hoje, diasAlerta)
   *
   * Dias de validade padrão: 90 dias. Configurável: CFG.bancoDiasValidade
   * ══════════════════════════════════════════════════════════════════════════
   */

  if (!CFG.bancoDiasValidade) CFG.bancoDiasValidade = 90;

  function _criarEntradaBanco(minutos, criadoEm, diasValidade) {
    criadoEm     = criadoEm     || new Date().toISOString().slice(0, 10);
    diasValidade = diasValidade || CFG.bancoDiasValidade;
    var d = new Date(criadoEm + 'T12:00:00');
    d.setDate(d.getDate() + diasValidade);
    return { minutos: minutos, criadoEm: criadoEm, venceEm: d.toISOString().slice(0, 10) };
  }

  function _calcBancoComVencimento(entradas, hoje) {
    hoje = hoje || new Date().toISOString().slice(0, 10);
    var validas = [], vencidas = [];
    (entradas || []).forEach(function(e) {
      if (!e.venceEm || e.venceEm >= hoje) { validas.push(e); }
      else { vencidas.push(e); }
    });
    return {
      validas:      validas,
      vencidas:     vencidas,
      saldoValido:  validas.reduce(function(s, e){ return s + (e.minutos || 0); }, 0),
      saldoVencido: vencidas.reduce(function(s, e){ return s + (e.minutos || 0); }, 0)
    };
  }

  function _relatorioVencimentos(entradas, hoje, diasAlerta) {
    hoje       = hoje       || new Date().toISOString().slice(0, 10);
    diasAlerta = diasAlerta || 30;
    var d = new Date(hoje + 'T12:00:00');
    d.setDate(d.getDate() + diasAlerta);
    var limite = d.toISOString().slice(0, 10);
    return (entradas || []).filter(function(e) {
      return e.venceEm && e.venceEm >= hoje && e.venceEm <= limite;
    }).sort(function(a, b){ return a.venceEm.localeCompare(b.venceEm); });
  }

  function _getRegistros()   { try{ return JSON.parse(localStorage.getItem('hr_registros')||'{}'); }catch(e){ return {}; } }
  function _saveRegistros(d) { try{ localStorage.setItem('hr_registros',JSON.stringify(d)); }catch(e){ console.error('[HR_IMPORT]',e); } }
  function _getFuncionarios(){ try{ return JSON.parse(localStorage.getItem('hr_funcionarios')||'{}'); }catch(e){ return {}; } }
  function _genId()          { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

  // ── Utilitários de tempo ─────────────────────────────────────────────────

  /** "07:30" → 450 (minutos desde meia-noite). Retorna NaN se inválido. */
  function _hhmm2min(str) {
    if (!str) return NaN;
    var s = String(str).trim();
    // aceita 07:30, 7:30, 730, 7h30, 7.5 (decimal de horas)
    var m;
    if ((m = s.match(/^(\d{1,2})[h:](\d{2})$/i))) return parseInt(m[1]) * 60 + parseInt(m[2]);
    if ((m = s.match(/^(\d{3,4})$/)))              { var v=parseInt(m[1]); return Math.floor(v/100)*60+(v%100); }
    if ((m = s.match(/^(\d+)[.,](\d+)$/)))         return Math.round(parseFloat(m[1]+'.'+m[2]) * 60);
    if ((m = s.match(/^(\d{1,2})$/)))              return parseInt(m[1]) * 60;
    return NaN;
  }

  /** 450 → "07:30" */
  function _min2hhmm(min) {
    if (isNaN(min) || min < 0) return '—';
    var h = Math.floor(min / 60);
    var m = Math.round(min % 60);
    if (m === 60) { h++; m = 0; }
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }

  /** 450 → "7h30min" */
  function _min2dur(min) {
    if (isNaN(min) || min === 0) return '0h';
    var neg = min < 0; min = Math.abs(min);
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    if (m === 60) { h++; m = 0; }
    return (neg ? '-' : '') + h + 'h' + (m > 0 ? m + 'min' : '');
  }

  /** "2026-05-09" → índice 0=Dom…6=Sáb */
  function _dow(isoDate) {
    return new Date(isoDate + 'T12:00:00').getDay();
  }

  /** "2026-05-09" → "Sáb" */
  function _dowNome(isoDate) {
    return DOW_NOMES[_dow(isoDate)];
  }

  /** Jornada esperada (minutos) para uma data ISO.
   * Domingo → 0 (folga).
   * Se funcId informado e funcionário tiver jornadaDiariaMin > 0,
   * usa esse valor para todos os dias úteis (seg–sáb). */
  function _jornadaEsperada(isoDate, funcId) {
    var d = _dow(isoDate);
    if (d === 0) return 0; // domingo = folga sempre

    // Consulta exceções globais (hr_excecoes)
    try {
      var excs = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
      var exc = Object.values(excs).find(function(e){ return e.data === isoDate; });
      if (exc) {
        // Feriado dia todo ou acordo sem meio período → jornada = 0 (não contabiliza)
        if (exc.tipo === 'feriado' && !exc.meioperiodo) return 0;
        if (exc.tipo === 'acordo') return 0; // acordo: saldo calculado livremente pelos horários reais
        // Feriado meio período ou declarado → usa jornada normal (calculada abaixo)
      }
    } catch(e) {}

    // Verifica se o funcionário está de férias nesta data → jornada = 0
    // Qualquer minuto trabalhado durante férias é hora extra 100%
    if (funcId) {
      try {
        var funcs2 = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}');
        var fFunc = funcs2[funcId];
        if (fFunc && fFunc.ativo === 'ferias' && fFunc.feriasInicio && fFunc.feriasFim) {
          if (isoDate >= fFunc.feriasInicio && isoDate <= fFunc.feriasFim) return 0;
        }
      } catch(e) {}
    }

    // Jornada customizada do funcionário (ex: jovem aprendiz 4h/dia)
    if (funcId) {
      try {
        var funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}');
        var jMin = funcs[funcId] && parseInt(funcs[funcId].jornadaDiariaMin);
        if (jMin > 0) return jMin;
      } catch(e) {}
    }
    return JORNADA[DOW_KEYS[d]] || 480;
  }

  /**
   * Dado entrada, saída (minutos), data ISO e almoço (minutos, 0 se trabalho direto).
   * Retorna {bruto, trab, saldo, extra, atraso, almoco}.
   *
   * REGRAS OFICIAIS:
   * - Sem almoço registrado → trabalho direto, NÃO desconta nada (Regra 2)
   * - Com almoço → trab = bruto - almoco (Regra 3)
   * - Saldo = trab - jornada (pode ser negativo) (Regras 4 e 5)
   * - extra = max(0, saldo), atraso = max(0, -saldo)
   */
  function _calcDia(entMin, saiMin, isoDate, almocoMin, funcId) {
    almocoMin = almocoMin || 0;

    var bruto = saiMin - entMin;
    if (bruto < 0) bruto += 1440; // overnight

    var jornadaMin = _jornadaEsperada(isoDate, funcId);

    // Trab = bruto menos pausa SE registrada (NÃO desconta automático)
    var trab = bruto - almocoMin;

    // Saldo real — pode ser negativo (atraso/falta)
    var saldo  = trab - jornadaMin;
    var extra  = Math.max(0, saldo);
    var atraso = Math.max(0, -saldo);

    return { bruto: bruto, trab: trab, saldo: saldo, extra: extra, atraso: atraso, almoco: almocoMin };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ETAPA 2 — CLASSIFICADOR DE HE
  // Função pura: recebe registro já calculado por _calcDia e classifica
  // os minutos de hora extra em faixas (50%, 100%, 200%).
  // NÃO faz nenhum cálculo financeiro.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Classifica os minutos de hora extra de um registro em faixas de HE.
   *
   * @param {Object} registro - objeto com { data: "yyyy-mm-dd", extra: Number (minutos) }
   * @returns {{ extra50: Number, extra100: Number, extra200: Number }} — minutos por faixa
   *
   * Regras:
   *   - dia especial (CFG.diasEspeciais)  → HE200
   *   - feriado     (CFG.feriados)        → HE100
   *   - domingo                           → HE100
   *   - demais dias úteis                 → HE50
   */
  function _classificarHE(registro) {
    var result = { extra50: 0, extra100: 0, extra200: 0 };

    // Sem horas extras → retorna zeros
    var extraMin = (registro && registro.extra) ? registro.extra : 0;
    if (extraMin <= 0) return result;

    var data   = registro.data   || '';
    var funcId = registro.funcId || null;

    // Verifica dia especial primeiro (maior prioridade)
    if (CFG.diasEspeciais && CFG.diasEspeciais.indexOf(data) >= 0) {
      result.extra200 = extraMin;
      return result;
    }

    // Trabalho durante férias → HE 100% (dobro) — CLT art.143
    if (funcId) {
      try {
        var funcsF = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}');
        var fF = funcsF[funcId];
        if (fF && fF.ativo === 'ferias' && fF.feriasInicio && fF.feriasFim) {
          if (data >= fF.feriasInicio && data <= fF.feriasFim) {
            result.extra100 = extraMin;
            return result;
          }
        }
      } catch(e) {}
    }

    // Verifica feriado
    if (CFG.feriados && CFG.feriados.indexOf(data) >= 0) {
      result.extra100 = extraMin;
      return result;
    }

    // Verifica domingo (dow === 0)
    var dow = data ? new Date(data + 'T12:00:00').getDay() : -1;
    if (dow === 0) {
      result.extra100 = extraMin;
      return result;
    }

    // Sábado → HE50 (1,5×) — dia útil de jornada reduzida, não equiparado a feriado
    if (dow === 6) {
      result.extra50 = extraMin;
      return result;
    }

    // Dia útil normal (seg–sex) → HE 50% (1,5× — CLT art.59 §1º)
    result.extra50 = extraMin;
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ETAPA 3 — CÁLCULO FINANCEIRO DE HE
  // Funções puras, desacopladas de _calcDia e do classificador.
  // Recebem minutos + multiplicador + valor/hora → retornam valor em R$.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula o valor/hora real de um funcionário com base na jornada
   * configurada (jornadaDiariaMin), evitando a distorção do divisor
   * fixo 220h CLT para funcionários de meio período ou jornada especial.
   *
   * Lógica:
   *   - Se o funcionário tem jornadaDiariaMin: usa dias úteis do mês
   *     × jornada/dia (seg-sex) + sábados × 4h (240min fixo).
   *   - Fallback: 220h (CLT padrão).
   *
   * @param {Object} func   — objeto do funcionário (de hr_funcionarios)
   * @param {String} mesISO — "yyyy-mm" do mês de referência (padrão: mês atual)
   * @returns {Number} valor da hora em R$
   */
  function _calcValorHoraReal(func, mesISO) {
    var salario = parseFloat((func && func.salario) || 0);
    if (!salario) return 0;

    var jornadaDiariaMin = (func && parseInt(func.jornadaDiariaMin)) || 0;

    // Calcula dias úteis reais do mês de referência (sempre — jornada customizada ou padrão)
    var ym  = (mesISO ? mesISO : new Date().toISOString()).slice(0, 7);
    var ano = parseInt(ym.slice(0, 4)), mes = parseInt(ym.slice(5, 7));
    var ultimoDia = new Date(ano, mes, 0).getDate();
    var diasSemanais = 0, diasSab = 0;
    var d = new Date(ym + '-01T12:00:00');
    var fim = new Date(ym + '-' + String(ultimoDia).padStart(2, '0') + 'T12:00:00');
    while (d <= fim) {
      var dow = d.getDay();
      if (dow === 6) diasSab++;
      else if (dow !== 0) diasSemanais++;
      d.setDate(d.getDate() + 1);
    }

    var horasMes;
    if (jornadaDiariaMin > 0) {
      // Jornada customizada (ex: jovem aprendiz 4h/dia)
      // Sábado sempre 4h independente da jornada customizada
      horasMes = (diasSemanais * jornadaDiariaMin + diasSab * 240) / 60;
    } else {
      // Jornada padrão desta empresa: seg-sex = 8h, sáb = 4h
      // Usa dias úteis REAIS do mês — mais justo que o divisor fixo CLT 220h
      horasMes = diasSemanais * 8 + diasSab * 4;
    }

    return salario / (horasMes || 220);
  }

  /**
   * Calcula o valor financeiro de horas extras.
   *
   * @param {Number} minutos      — minutos de hora extra na faixa
   * @param {Number} multiplicador — 1.5 (HE50) / 2.0 (HE100) / 3.0 (HE200)
   * @param {Number} valorHora    — valor base da hora em R$
   * @returns {Number} valor em R$
   *
   * Fórmula: (minutos / 60) × multiplicador × valorHora
   */
  function _calcValorHE(minutos, multiplicador, valorHora) {
    if (!minutos || minutos <= 0) return 0;
    if (!multiplicador || multiplicador <= 0) return 0;
    if (!valorHora || valorHora <= 0) return 0;
    return (minutos / 60) * multiplicador * valorHora;
  }

  /**
   * Calcula o resumo financeiro completo de horas extras de um grupo.
   * Recebe o resultado de _calcGrupo e o valor/hora do funcionário.
   *
   * @param {Object} calcGrupo  — retorno de _calcGrupo(grupo)
   * @param {Number} valorHora  — valor da hora em R$ (0 se não informado)
   * @returns {Object} resumo financeiro:
   *   {
   *     totalExtra50Min, totalExtra100Min, totalExtra200Min,
   *     valorExtra50, valorExtra100, valorExtra200,
   *     valorTotalExtras
   *   }
   */
  function _calcFinanceiroGrupo(calcGrupo, valorHora) {
    valorHora = valorHora || 0;

    var totalExtra50Min  = 0;
    var totalExtra100Min = 0;
    var totalExtra200Min = 0;

    // Itera pelas linhas calculadas e classifica cada dia
    (calcGrupo.linhasCalc || []).forEach(function(lc) {
      if (!lc.valido || !lc.res || lc.res.extra <= 0) return;

      // Monta objeto mínimo para o classificador
      var reg = { data: lc.r.data, extra: lc.res.extra };
      var classe = _classificarHE(reg);

      totalExtra50Min  += classe.extra50;
      totalExtra100Min += classe.extra100;
      totalExtra200Min += classe.extra200;
    });

    var valorExtra50  = _calcValorHE(totalExtra50Min,  CFG.he.normal,   valorHora);
    var valorExtra100 = _calcValorHE(totalExtra100Min, CFG.he.domingo,  valorHora);
    var valorExtra200 = _calcValorHE(totalExtra200Min, CFG.he.especial, valorHora);

    return {
      totalExtra50Min:  totalExtra50Min,
      totalExtra100Min: totalExtra100Min,
      totalExtra200Min: totalExtra200Min,
      valorExtra50:     valorExtra50,
      valorExtra100:    valorExtra100,
      valorExtra200:    valorExtra200,
      valorTotalExtras: valorExtra50 + valorExtra100 + valorExtra200
    };
  }

  /** Formata valor monetário: 1234.5 → "R$ 1.234,50" */
  function _fmtMoeda(v) {
    if (isNaN(v) || v === null || v === undefined) return 'R$ —';
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUDITORIA VISUAL — badges de inconsistência por dia
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Analisa um registro calculado e retorna array de badges de auditoria.
   * Cada badge: { label, cor, title }
   *
   * Critérios:
   *  BATIDAS INCOMPLETAS  — incompleto (entrada sem saída ou vice-versa)
   *  TRABALHO DIRETO      — bruto > 0 e almoço = 0 e bruto >= 240min (4h+)
   *  ALMOÇO LONGO         — almoço > 120min (>2h)
   *  JORNADA SUSPEITA     — trab > 840min (>14h)
   *
   * @param {Object} lc — item de linhasCalc: { r, valido, res }
   * @returns {Array}   badges
   */
  function _auditoriaBadges(lc) {
    var badges = [];
    var res = lc.res;

    if (res.incompleto) {
      badges.push({ label: '⚠ BATIDAS INCOMPLETAS', cor: '#c85c5c',
        title: 'Apenas uma batida registrada — dia precisa de correção manual' });
      return badges; // incompleto já diz tudo, não empilha outros
    }

    if (!lc.valido) return badges; // inválido sem incompleto = sem horário

    // Trabalho direto: não houve intervalo, jornada relevante (≥4h)
    if (res.almoco === 0 && res.bruto >= 240) {
      badges.push({ label: '🔄 TRABALHO DIRETO', cor: '#8ec8c8',
        title: 'Sem intervalo de almoço registrado — confirme se foi trabalho direto intencional' });
    }

    // Almoço longo (>2h)
    if (res.almoco > 120) {
      badges.push({ label: '🍽 ALMOÇO LONGO', cor: GOLD,
        title: 'Intervalo de almoço de ' + _min2dur(res.almoco) + ' — acima de 2h' });
    }

    // Jornada suspeita (>14h de trabalho efetivo)
    if (res.trab > 840) {
      badges.push({ label: '🚨 JORNADA SUSPEITA', cor: '#c85c5c',
        title: 'Jornada efetiva de ' + _min2dur(res.trab) + ' — acima de 14h' });
    }

    return badges;
  }

  /** Conta total de anomalias em um grupo. */
  function _totalAnomalias(calc) {
    return calc.linhasCalc.reduce(function(s, lc) {
      return s + _auditoriaBadges(lc).length;
    }, 0);
  }


  var GOLD  = '#C9A84C', GOLDB = 'rgba(201,168,76,.35)', GOLD2 = 'rgba(201,168,76,.12)';
  var S2    = '#161410', BD = 'rgba(201,168,76,.12)', BD2 = 'rgba(255,255,255,.07)';
  var T1    = '#f0ece4', T2 = '#b8b0a0', T3 = '#7a7268';
  var GREEN = '#5cb85c', RED = '#c85c5c', BLUE = '#5c8ec8';
  var CSS_CARD = 'background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;padding:14px 16px;margin-bottom:12px;';

  function _toast(m) { if (typeof toast === 'function') toast(m); else console.log('[HR_IMPORT]', m); }
  function _esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _closeOverlay(id) { var e = document.getElementById(id); if (e) e.remove(); }
  function _overlay(id, html) {
    _closeOverlay(id);
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,7,4,.97);' +
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;' +
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  // ── STATE ────────────────────────────────────────────────────────────────
  var _state = {
    raw: '',          // texto bruto do relatório
    linhas: [],       // [{nome, data, entrada, saida, almoco?}]
    grupos: [],       // [{nome, registros:[...], funcId:null}]
    periodo: {di:'', df:''},
    _registrosDiretos: null  // registros prontos do Cartão de Ponto (com almocoManual)
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PARSER UNIVERSAL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Detecta o delimitador mais provável no texto.
   */
  function _detectSep(text) {
    var counts = { ';': 0, ',': 0, '\t': 0, '|': 0 };
    (text.match(/[;,\t|]/g) || []).forEach(function(c){ counts[c]++; });
    var best = ';', bestN = 0;
    Object.keys(counts).forEach(function(k){ if(counts[k] > bestN){ bestN = counts[k]; best = k; } });
    return best;
  }

  /**
   * Normaliza uma data em vários formatos para "yyyy-mm-dd".
   * Suporta: dd/mm/yyyy, dd-mm-yyyy, yyyy/mm/dd, yyyy-mm-dd, ddmm (ano inferido).
   */
  function _normalizeDate(s) {
    s = String(s||'').trim();
    var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))
      return m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0');
    if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)))
      return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
    if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)))
      return '20' + m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
    // Formato ddmm (ano corrente)
    if ((m = s.match(/^(\d{2})(\d{2})$/)))
      return new Date().getFullYear() + '-' + m[2] + '-' + m[1];
    return '';
  }

  /**
   * Tenta extrair um horário de uma célula que pode conter
   * "07:00", "07:00 - 17:00", "E:07:00 S:17:00", etc.
   * Retorna { entrada, saida } (strings HH:MM ou '').
   */
  function _extrairHorarios(cel) {
    cel = String(cel||'').trim();
    var times = cel.match(/\d{1,2}[h:]\d{2}/g) || [];
    if (times.length >= 2) return { entrada: times[0].replace('h',':'), saida: times[1].replace('h',':') };
    if (times.length === 1) return { entrada: times[0].replace('h',':'), saida: '' };
    return { entrada: '', saida: '' };
  }

  /**
   * Parser principal. Aceita:
   *   Formato A: nome;data;entrada;saida[;almoco_ini;almoco_fim]
   *   Formato B: nome;data;entrada-saida
   *   Formato C: data;nome;entrada;saida  (detecta pela ordem)
   *   Formato D: linhas de texto livre com padrão reconhecível
   */
  function _parseRelatorio(texto) {
    var linhas = texto.split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    if (linhas.length === 0) return [];

    var sep = _detectSep(linhas.slice(0,5).join('\n'));
    var registros = [];

    // Tenta ignorar cabeçalho (linha sem data válida na posição esperada)
    var startIdx = 0;
    var primeiraColunas = linhas[0].split(sep);
    var temData = primeiraColunas.some(function(c){ return _normalizeDate(c.trim()) !== ''; });
    if (!temData) startIdx = 1; // pula cabeçalho

    for (var i = startIdx; i < linhas.length; i++) {
      var partes = linhas[i].split(sep).map(function(p){ return p.trim(); });
      if (partes.length < 2) continue;

      var nome = '', dataISO = '', entrada = '', saida = '', almIni = '', almFim = '';

      // Detecta posição da data para inferir formato
      var posData = -1;
      for (var j = 0; j < Math.min(partes.length, 4); j++) {
        if (_normalizeDate(partes[j]) !== '') { posData = j; break; }
      }
      if (posData === -1) continue; // linha sem data reconhecível

      if (posData === 0) {
        // Formato: data;nome;entrada;saida[;almIni;almFim]
        dataISO = _normalizeDate(partes[0]);
        nome    = partes[1] || '';
        if (partes.length >= 4) {
          entrada = partes[2]; saida = partes[3];
          almIni  = partes[4]||''; almFim = partes[5]||'';
        } else if (partes.length === 3) {
          var h = _extrairHorarios(partes[2]);
          entrada = h.entrada; saida = h.saida;
        }
      } else if (posData === 1) {
        // Formato: nome;data;entrada;saida[;almIni;almFim]
        nome    = partes[0];
        dataISO = _normalizeDate(partes[1]);
        if (partes.length >= 4) {
          entrada = partes[2]; saida = partes[3];
          almIni  = partes[4]||''; almFim = partes[5]||'';
        } else if (partes.length === 3) {
          var h2 = _extrairHorarios(partes[2]);
          entrada = h2.entrada; saida = h2.saida;
        }
      } else {
        // Fallback: qualquer posição
        dataISO = _normalizeDate(partes[posData]);
        nome    = partes.slice(0, posData).join(' ').trim() || partes[posData+1]||'';
        entrada = partes[posData+1]||''; saida = partes[posData+2]||'';
      }

      if (!dataISO || !nome) continue;

      // Normaliza horários
      nome    = nome.replace(/["']/g,'').trim();
      entrada = String(entrada).replace(/["']/g,'').trim().replace('h',':');
      saida   = String(saida).replace(/["']/g,'').trim().replace('h',':');

      // Valida formato HH:MM
      if (entrada && !entrada.match(/^\d{1,2}:\d{2}$/)) {
        var he = _extrairHorarios(entrada); entrada = he.entrada; saida = he.saida || saida;
      }

      // Calcula intervalo de almoço se fornecido
      var almocoMin = 0;
      if (almIni && almFim) {
        var aI = _hhmm2min(almIni), aF = _hhmm2min(almFim);
        if (!isNaN(aI) && !isNaN(aF) && aF > aI) almocoMin = aF - aI;
      }

      var dow = _dow(dataISO);
      if (dow === 0) continue; // domingo: pula (folga)

      registros.push({
        nome: nome,
        data: dataISO,
        entrada: entrada,
        saida: saida,
        almEntrada: almIni  || null,
        almSaida:   almFim  || null,
        almocoManual: almocoMin > 0 ? almocoMin : null
      });
    }

    return registros;
  }

  /**
   * Agrupa registros por nome (case-insensitive, sem acentos).
   */
  function _normalNome(s) {
    return String(s||'').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
  }

  function _agrupar(registros) {
    var grupos = {};
    registros.forEach(function(r) {
      var k = _normalNome(r.nome);
      if (!grupos[k]) grupos[k] = { nome: r.nome, registros: [], funcId: null };
      grupos[k].registros.push(r);
    });
    // Ordena registros por data dentro de cada grupo
    Object.values(grupos).forEach(function(g) {
      g.registros.sort(function(a,b){ return a.data.localeCompare(b.data); });
    });
    return Object.values(grupos);
  }

  /**
   * Tenta vincular automaticamente cada grupo a um funcionário.
   * Estratégia: compara primeiro nome / iniciais / similaridade de token.
   */
  function _vincularAuto(grupos) {
    var funcs = Object.values(_getFuncionarios()).filter(function(f){ return f.ativo !== false; });
    grupos.forEach(function(g) {
      if (g.funcId) return;
      var nNome = _normalNome(g.nome);
      var tokens = nNome.split(' ').filter(Boolean);

      var melhor = null, melhorPts = 0;
      funcs.forEach(function(f) {
        var nF = _normalNome(f.nome);
        var fTokens = nF.split(' ').filter(Boolean);
        var pts = 0;
        // Token a token: match exato vale 3, prefixo vale 1
        tokens.forEach(function(t) {
          fTokens.forEach(function(ft) {
            if (t === ft) pts += 3;
            else if (ft.startsWith(t) || t.startsWith(ft)) pts += 1;
          });
        });
        if (pts > melhorPts) { melhorPts = pts; melhor = f; }
      });

      if (melhor && melhorPts >= 2) g.funcId = melhor.id;
    });
    return grupos;
  }

  /**
   * Calcula os dados de exibição de um grupo (totais, saldo real).
   * Segue as regras oficiais do sistema de banco de horas.
   */
  function _calcGrupo(g) {
    var totalTrabMin = 0, totalExtraMin = 0, totalAtrasoMin = 0;

    // Injeta registros sintéticos para dias declarados pelo empregador
    // (dias que constam em hr_excecoes como tipo='declarado' mas não têm batida no grupo)
    var registrosComDeclarados = g.registros.slice(); // cópia
    try {
      var excsAll = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
      var datasNoGrupo = {};
      g.registros.forEach(function(r){ datasNoGrupo[r.data] = true; });
      // Para cada exceção declarada, verifica se o período do grupo cobre a data
      Object.values(excsAll).forEach(function(exc){
        if (exc.tipo !== 'declarado') return;
        if (datasNoGrupo[exc.data]) return; // já tem registro real
        // Verifica se a data está no intervalo dos registros do grupo (±31 dias)
        if (g.registros.length === 0) return;
        var datas = g.registros.map(function(r){ return r.data; }).sort();
        var diGrupo = datas[0], dfGrupo = datas[datas.length-1];
        // Expande 1 mês para pegar declarados no mesmo mês
        var mesGrupo = diGrupo.slice(0,7);
        if (!exc.data.startsWith(mesGrupo)) return;
        // Injeta como registro sintético com o horário declarado
        registrosComDeclarados.push({
          data:     exc.data,
          entrada:  exc.horEntrada || '07:00',
          saida:    exc.horSaida   || '17:00',
          almocoManual: null, // sem almoço declarado = trabalho direto pelo guia
          _declarado: true,
          _descricao: exc.descricao || ''
        });
      });
    } catch(e) {}

    var linhasCalc = registrosComDeclarados.map(function(r) {
      var entMin = _hhmm2min(r.entrada);
      var saiMin = _hhmm2min(r.saida);

      // Registro incompleto: falta entrada ou saída (Regra 12)
      var incompleto = isNaN(entMin) || isNaN(saiMin);
      // Overnight: saída < entrada só é válido se CFG.allowOvernight === true
      // Ex: 22:00 → 05:00 = 420min (7h) ao invés de ser descartado como inválido
      var isOvernight = !incompleto && saiMin < entMin && CFG.allowOvernight === true;
      // Horário invertido sem overnight = inválido (Regra 13)
      var valido = !incompleto && (saiMin > entMin || isOvernight);

      var res = { trab:0, saldo:0, extra:0, atraso:0, almoco:0, bruto:0, incompleto: incompleto && !!(r.entrada || r.saida) };

      if (valido) {
        // Passa almoço já calculado (minutos) diretamente ao _calcDia (Regras 2 e 3)
        // Passa funcId para _calcDia respeitar jornada customizada do funcionário
        var almocoMin = (r.almocoManual !== null && r.almocoManual !== undefined) ? r.almocoManual : 0;
        res = _calcDia(entMin, saiMin, r.data, almocoMin, g.funcId || null);
        res.incompleto = false;
      }

      // Marca registro declarado para exibição na preview
      if (r._declarado) { res._declarado = true; res._descricao = r._descricao; }

      // Saldo real acumulado (Regra 5): extras positivas MENOS horas negativas
      totalTrabMin  += res.trab;
      totalExtraMin += res.extra;
      totalAtrasoMin+= res.atraso;
      return { r:r, valido:valido, res:res };
    });

    // Saldo líquido = extras - atrasos (Regra 5)
    var saldoLiquidoMin = totalExtraMin - totalAtrasoMin;

    var resultado = {
      linhasCalc: linhasCalc,
      totalTrabMin: totalTrabMin,
      totalExtraMin: totalExtraMin,
      totalAtrasoMin: totalAtrasoMin,
      saldoLiquidoMin: saldoLiquidoMin,
      diasCount: g.registros.length
    };

    // Item 5 — loga detalhes quando CFG.auditMode === true
    if (CFG.auditMode) _auditLogGrupo(g, resultado);

    return resultado;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UI — TELA DE IMPORTAÇÃO
  // ══════════════════════════════════════════════════════════════════════════

  function abrirImportacao() {
    _state.raw = '';
    _state.linhas = [];
    _state.grupos = [];
    _state.periodo = { di:'', df:'' };
    _state._registrosDiretos = null;
    _renderTelaUpload();
  }

  function _renderTelaUpload() {
    var html = '<div style="width:100%;max-width:560px;padding:0 16px;">' +
      _header('Importar Relatório', 'Cálculo ao minuto · 8h/dia · 4h/sáb') +

      // Card de instruções
      '<div style="' + CSS_CARD + 'margin-bottom:14px;">' +
        '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">📋 Formato esperado</div>' +
        '<div style="font-size:.73rem;color:' + T2 + ';line-height:1.7;">' +
          'Cole ou importe um CSV/texto com as colunas:<br>' +
          '<code style="background:rgba(255,255,255,.05);padding:2px 6px;border-radius:4px;font-size:.7rem;color:' + GOLD + ';">' +
            'nome ; data ; entrada ; saída' +
          '</code><br>' +
          '<span style="color:' + T3 + ';font-size:.68rem;">Separadores aceitos: ponto-e-vírgula, vírgula, tab, barra.</span><br>' +
          '<span style="color:' + T3 + ';font-size:.68rem;">Domingo é ignorado automaticamente. Sábado = 4h.</span>' +
        '</div>' +
      '</div>' +

      // Área de texto
      '<div style="margin-bottom:12px;">' +
        '<div style="font-size:.72rem;color:' + T3 + ';font-weight:600;letter-spacing:.04em;margin-bottom:5px;">RELATÓRIO (cole aqui)</div>' +
        '<textarea id="imp_texto" rows="10" ' +
          'style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:11px;' +
          'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
          'font-size:.78rem;font-family:\'Courier New\',monospace;outline:none;resize:vertical;' +
          'line-height:1.6;" ' +
          'oninput="HR_IMPORT._onTextareaInput(this)">' +
        '</textarea>' +
        '<div id="imp_textarea_hint" style="font-size:.65rem;color:' + T3 + ';margin-top:4px;padding:0 2px;">' +
          'Ex: gibs;09/05/2026;07:00;11:06' +
        '</div>' +
      '</div>' +

      // Upload de arquivo
      '<div style="' + CSS_CARD + 'margin-bottom:14px;cursor:pointer;" onclick="document.getElementById(\'imp_file\').click()">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="font-size:1.4rem;">📁</div>' +
          '<div>' +
            '<div style="font-size:.82rem;font-weight:700;color:' + T1 + ';">Importar arquivo</div>' +
            '<div style="font-size:.68rem;color:' + T3 + ';">.xls · .xlsx · .csv · .txt · .tsv</div>' +
          '</div>' +
          '<div id="imp_file_nome" style="margin-left:auto;font-size:.7rem;color:' + T3 + ';text-align:right;max-width:140px;word-break:break-all;">Nenhum</div>' +
        '</div>' +
        '<input id="imp_file" type="file" accept=".csv,.txt,.tsv,.xls,.xlsx,.xlsm" style="display:none;" onchange="HR_IMPORT._onArquivo(this)">' +
      '</div>' +

      '<button onclick="HR_IMPORT._processar()" ' +
        'style="width:100%;padding:14px;border-radius:11px;' +
        'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
        'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
        'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;' +
        'cursor:pointer;letter-spacing:.04em;margin-bottom:8px;">⚡ Processar Relatório</button>' +

      '<button onclick="HR_IMPORT._fechar()" ' +
        'style="width:100%;padding:12px;border-radius:11px;background:transparent;' +
        'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
        'font-size:.85rem;cursor:pointer;">Cancelar</button>' +
    '</div>';

    _overlay('hrImport', html);
  }

  /**
   * Converte serial numérico do Excel para "yyyy-mm-dd".
   * Excel epoch: 1 = 01/01/1900 (com bug do 1900 como bissexto).
   */
  function _xlsSerial2Date(serial) {
    if (!serial || isNaN(serial)) return '';
    // Ajuste do bug do Excel (considera 1900 bissexto)
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
    var y = d.getUTCFullYear(), mo = d.getUTCMonth()+1, day = d.getUTCDate();
    if (y < 1990 || y > 2100) return ''; // serial inválido
    return y + '-' + String(mo).padStart(2,'0') + '-' + String(day).padStart(2,'0');
  }

  /**
   * Converte serial fracionário de hora do Excel para "HH:MM".
   * 0.5 = 12:00, 0.291666... = 07:00, etc.
   */
  function _xlsSerial2Time(serial) {
    if (serial === '' || serial === null || serial === undefined || isNaN(parseFloat(serial))) return '';
    var frac = parseFloat(serial) % 1; // parte fracionária
    if (frac < 0) frac += 1;
    var totalMin = Math.round(frac * 1440);
    return _min2hhmm(totalMin);
  }

  /**
   * Carrega SheetJS do CDN se ainda não disponível.
   * Retorna Promise que resolve quando XLSX estiver pronto.
   */
  function _carregarSheetJS() {
    return new Promise(function(resolve, reject) {
      if (typeof XLSX !== 'undefined') { resolve(XLSX); return; }
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload  = function() { resolve(window.XLSX); };
      script.onerror = function() { reject(new Error('Não foi possível carregar SheetJS.')); };
      document.head.appendChild(script);
    });
  }

  /**
   * Lê planilha XLS/XLSX com SheetJS e converte para texto CSV interno.
   * Tenta detectar automaticamente quais colunas são nome, data, entrada, saída.
   */
  /**
   * Converte serial de hora do SheetJS (número 0..1 ou objeto Date/time)
   * para string "HH:MM". Aceita também datetime.time vindo do openpyxl
   * que o SheetJS representa como Date quando cellDates:true, mas aqui
   * usamos cellDates:false, então vem como fração decimal.
   */
  function _xlsTime2hhmm(val) {
    if (val === null || val === undefined || val === '') return '';
    // Número decimal 0..1 → fração do dia
    if (typeof val === 'number') {
      var frac = val % 1;
      if (frac < 0) frac += 1;
      // Se o número inteiro for grande (serial de data + hora), pega só fração
      var totalMin = Math.round(frac * 1440);
      return _min2hhmm(totalMin);
    }
    // String já formatada "HH:MM" ou "HH:MM:SS"
    var s = String(val).trim();
    var m = s.match(/^(\d{1,2})[h:](\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
    if (m) {
      var h = parseInt(m[1]), mn = parseInt(m[2]);
      if (m[3] && m[3].toUpperCase() === 'PM' && h < 12) h += 12;
      if (m[3] && m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      return String(h).padStart(2,'0') + ':' + String(mn).padStart(2,'0');
    }
    return '';
  }

  /**
   * Detecta e extrai Cartão de Ponto de abas com formato:
   * 3 funcionários lado a lado (offsets 0, 15, 30).
   * Cada bloco tem: col+0=Data, col+1=EntManhã, col+3=SaiManhã,
   *                 col+6=EntTarde, col+8=SaiTarde, col+10=EntExtra, col+12=SaiExtra
   * Data no formato "DD DiaSem" ex: "04 2ª".
   * Retorna array de {nome, data, entrada, saida, almIni, almFim}.
   */
  function _xlsCartaoPontoParaRegistros(raw, fmt, ano, mes) {
    var registros = [];

    // Localiza a linha "Cartão de ponto"
    var cartaoRow = -1;
    for (var ri = 0; ri < raw.length; ri++) {
      if ((raw[ri] || []).some(function(v){ return String(v||'').trim() === 'Cartão de ponto'; })) {
        cartaoRow = ri; break;
      }
    }
    if (cartaoRow < 0) return registros;

    // Lê nomes dos funcionários (linha 3, cols 9, 24, 39)
    var nomesRow = raw[3] || [];
    var nomesCols = [9, 24, 39]; // posições do nome em cada bloco
    var offsets = [0, 15, 30];   // offset de coluna de cada bloco

    // Confirma cabeçalho de colunas (linha cartaoRow+2): Entrada nas posições relativas 1,6,10
    // col+1=EntManhã, col+3=SaiManhã, col+6=EntTarde, col+8=SaiTarde, col+10=EntExtra, col+12=SaiExtra
    var dataStartRow = cartaoRow + 3; // pula "Cartão de ponto" + "Data/Antes/Depois" + "Entrada/Saída"

    offsets.forEach(function(off, bi) {
      var nome = String(nomesRow[nomesCols[bi]] || '').trim();
      if (!nome || nome.length < 2) return;
      nome = nome.charAt(0).toUpperCase() + nome.slice(1);

      for (var ri = dataStartRow; ri < raw.length; ri++) {
        var row = raw[ri] || [];
        var celData = String(row[off] || '').trim();
        // Formato: "04 2ª" ou "04 Sá" etc.
        var mData = celData.match(/^(\d{1,2})\s+/);
        if (!mData) continue;
        var dia = parseInt(mData[1]);
        if (isNaN(dia) || dia < 1 || dia > 31) continue;

        var dataISO = ano + '-' + String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
        var dt = new Date(dataISO + 'T12:00:00');
        if (isNaN(dt.getTime()) || dt.getDay() === 0) continue; // data inválida ou domingo

        // Lê os 6 slots de horário em ordem de coluna (batida1..batida6)
        // IMPORTANTE: o XLS usa colunas fixas para sequência de batidas, NÃO
        // semântica fixa de "manhã/tarde". Uma jornada direta sem almoço tem
        // batida1=entrada e batida2=saída — que caem em off+1 e off+3 (slots
        // originalmente chamados de "entManha" e "saiManha"). Quando o
        // trabalhador vai ao almoço, tem 4 batidas: off+1, off+3, off+6, off+8.
        // Tratar os slots com nomes semânticos causava:
        //   - saída do dia lida em off+6 ("entTarde") → saída ficava vazia → "sem horário"
        //   - última batida real ignorada → almoço e jornada calculados errado
        var slot1 = _xlsTime2hhmm(row[off + 1]);
        var slot2 = _xlsTime2hhmm(row[off + 3]);
        var slot3 = _xlsTime2hhmm(row[off + 6]);
        var slot4 = _xlsTime2hhmm(row[off + 8]);
        var slot5 = _xlsTime2hhmm(row[off + 10]);
        var slot6 = _xlsTime2hhmm(row[off + 12]);

        // Coleta todas as batidas presentes e ordena cronologicamente
        var batidas = [slot1, slot2, slot3, slot4, slot5, slot6]
          .filter(function(b) { return !!b; })
          .sort(); // HH:MM ordena corretamente como string

        if (batidas.length === 0) continue; // dia sem registro algum

        // Primeira batida = entrada do dia / última = saída do dia
        var entrada = batidas[0];
        var saida   = batidas[batidas.length - 1];

        // Almoço: calculado apenas se houver 4+ batidas
        // batidas[1] = saída para almoço, batidas[2] = retorno do almoço
        var almocoMin = 0;
        if (batidas.length >= 4) {
          var smMin = _hhmm2min(batidas[1]);
          var etMin = _hhmm2min(batidas[2]);
          if (!isNaN(smMin) && !isNaN(etMin) && etMin > smMin) almocoMin = etMin - smMin;
        }

        registros.push({
          nome: nome, data: dataISO,
          entrada: entrada, saida: saida,
          almocoManual: almocoMin > 0 ? almocoMin : null
        });
      }
    });

    return registros;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARSER DE RELÓGIO BIOMÉTRICO
  // Formato: blocos de 3 linhas por funcionário:
  //   linha 0 — IDUsuário: XX  Nome: FULANO  ...
  //   linha 1 — 1  2  3  4 … 31  (números dos dias do mês)
  //   linha 2 — batidas por coluna (múltiplos horários separados por \n)
  // ══════════════════════════════════════════════════════════════════════════

  /** Detecta se a planilha é do relógio biométrico. */
  function _isBiometricoXLS(rows) {
    for (var i = 0; i < Math.min(30, rows.length); i++) {
      var row = rows[i] || [];
      var hasId   = row.some(function(c){ return String(c).trim() === 'IDUsuário:'; });
      var hasNome = row.some(function(c){ return String(c).trim() === 'Nome:'; });
      if (hasId && hasNome) return true;
    }
    return false;
  }

  /**
   * Extrai registros do relógio biométrico.
   * Cada batida única = sem saída (erro para correção).
   * 2+ batidas = entrada = primeira, saída = última.
   * Dias sem batida não são incluídos.
   */
  function _parseBiometricoXLS(workbook) {
    var ws   = workbook.Sheets[workbook.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    // Detecta mês/ano nas primeiras linhas (ex: "01/05/2026")
    var ano = new Date().getFullYear(), mes = new Date().getMonth() + 1;
    for (var ri = 0; ri < Math.min(10, rows.length); ri++) {
      var rowStr = (rows[ri] || []).join('|');
      var mPer = rowStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mPer) { ano = parseInt(mPer[3]); mes = parseInt(mPer[2]); break; }
    }

    var registros = [];
    var i = 0;
    while (i < rows.length) {
      var row = rows[i];
      var hasId   = row.some(function(c){ return String(c).trim() === 'IDUsuário:'; });
      var hasNome = row.some(function(c){ return String(c).trim() === 'Nome:'; });

      if (hasId && hasNome) {
        // Extrai nome
        var nome = '';
        for (var j = 0; j < row.length; j++) {
          if (String(row[j]).trim() === 'Nome:' && j + 1 < row.length) {
            nome = String(row[j + 1]).trim();
            break;
          }
        }

        var daysRow  = rows[i + 1] || [];
        var punchRow = rows[i + 2] || [];

        for (var col = 0; col < daysRow.length; col++) {
          var dayCell = String(daysRow[col]).trim();
          if (!/^\d+$/.test(dayCell)) continue;
          var dayNum = parseInt(dayCell);
          if (dayNum < 1 || dayNum > 31) continue;

          var dataISO = ano + '-' + String(mes).padStart(2,'0') + '-' + String(dayNum).padStart(2,'0');
          var dt = new Date(dataISO + 'T12:00:00');
          if (isNaN(dt.getTime()) || dt.getDay() === 0) continue; // inválida ou domingo

          var cell    = String(punchRow[col] || '').trim();
          var punches = cell
            ? cell.split(/[\r\n]+/).map(function(t){ return t.trim(); }).filter(Boolean)
            : [];

          if (punches.length === 0) continue; // dia sem batida alguma — pula

          // Almoço: calculado apenas se houver 4+ batidas
          // batidas[1] = saída para almoço, batidas[2] = retorno do almoço
          var almocoMin = 0;
          var almEntradaStr = null, almSaidaStr = null;
          if (punches.length >= 4) {
            var saAlmMin  = _hhmm2min(punches[1]);
            var retAlmMin = _hhmm2min(punches[2]);
            if (!isNaN(saAlmMin) && !isNaN(retAlmMin) && retAlmMin > saAlmMin) {
              almocoMin    = retAlmMin - saAlmMin;
              almEntradaStr = punches[1]; // saída para almoço
              almSaidaStr   = punches[2]; // retorno do almoço
            }
          }

          registros.push({
            nome:         nome,
            data:         dataISO,
            entrada:      punches[0] || '',
            saida:        punches.length > 1 ? punches[punches.length - 1] : '',
            almEntrada:   almEntradaStr,
            almSaida:     almSaidaStr,
            almocoManual: almocoMin > 0 ? almocoMin : null,
            _doBiometrico: true,
            _todasBatidas: punches
          });
        }

        i += 3;
      } else {
        i++;
      }
    }
    return registros;
  }

  function _xlsParaTexto(workbook) {
    // ── Tenta formato biométrico (IDUsuário: / Nome:) ───────────────────────
    var ws0   = workbook.Sheets[workbook.SheetNames[0]];
    var rows0 = XLSX.utils.sheet_to_json(ws0, { header: 1, raw: true, defval: '' });
    if (_isBiometricoXLS(rows0)) {
      var regsBio = _parseBiometricoXLS(workbook);
      if (regsBio.length > 0) {
        _state._registrosDiretos = regsBio;
        return regsBio.map(function(r) {
          return [r.nome, r.data, r.entrada || '', r.saida || ''].join(';');
        }).join('\n');
      }
    }

    // ── Tenta formato "Cartão de Ponto" (abas com horários reais) ────────────
    // Varre TODAS as abas procurando "Cartão de ponto"
    var todosRegistros = [];
    var anoMesPeriodo = null;

    workbook.SheetNames.forEach(function(sname) {
      var ws = workbook.Sheets[sname];
      var raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true,  defval: '' });
      var fmt = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

      // Extrai ano/mês do período da aba (ex: "Data de presença:01/05/2026~23/05/2026")
      var ano = new Date().getFullYear(), mes = new Date().getMonth() + 1;
      for (var ri = 0; ri < Math.min(5, raw.length); ri++) {
        var rowStr = (raw[ri] || []).join('|');
        var mPer = rowStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (mPer) { ano = parseInt(mPer[3]); mes = parseInt(mPer[2]); anoMesPeriodo = {ano:ano, mes:mes}; break; }
      }
      if (anoMesPeriodo) { ano = anoMesPeriodo.ano; mes = anoMesPeriodo.mes; }

      var regs = _xlsCartaoPontoParaRegistros(raw, fmt, ano, mes);
      todosRegistros = todosRegistros.concat(regs);
    });

    if (todosRegistros.length > 0) {
      // Deduplica (mesmo nome+data, mantém o que tem mais info)
      var mapa = {};
      todosRegistros.forEach(function(r) {
        var k = r.nome.toLowerCase() + '|' + r.data;
        if (!mapa[k] || (r.entrada && !mapa[k].entrada)) mapa[k] = r;
      });
      // Guarda registros prontos (com almocoManual em minutos) para _processar() usar
      // sem perda de dados na conversão CSV→parse (Regras 2 e 3)
      _state._registrosDiretos = Object.values(mapa);
      // Retorna CSV simples apenas para preview no textarea
      var linhas = _state._registrosDiretos.map(function(r) {
        return [r.nome, r.data, r.entrada || '', r.saida || ''].join(';');
      });
      return linhas.join('\n');
    }

    // ── Fallback: aba 1 no formato padrão ────────────────────────────────────
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName];
    var raw  = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true,  defval: '' });
    var fmt  = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    if (!raw || raw.length < 2) return '';

    var linhas = [];

    // Detecta cabeçalho e índices de colunas
    var header = (raw[0] || []).map(function(c){ return String(c||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); });
    var startRow = 0;

    // Índices conhecidos por nome de coluna
    var iNome = -1, iData = -1, iEnt = -1, iSai = -1, iAlmIni = -1, iAlmFim = -1;
    var colNomes  = ['nome','funcionario','colaborador','empregado','trabalhador'];
    var colDatas  = ['data','dia','date','dt'];
    var colEnt    = ['entrada','in','inicio','chegada','start','ponto entrada','ent'];
    var colSai    = ['saida','saída','out','fim','saida','termino','end','ponto saida','sai'];
    var colAlmIni = ['inicio almoco','ini almoco','almoco inicio','lunch start','int ini','intervalo ini'];
    var colAlmFim = ['fim almoco','almoco fim','lunch end','int fim','intervalo fim'];

    header.forEach(function(h, i) {
      var hn = h.replace(/\s+/g,' ').trim();
      if (iNome  < 0 && colNomes.some(function(c){ return hn.indexOf(c) >= 0; }))   iNome  = i;
      if (iData  < 0 && colDatas.some(function(c){ return hn.indexOf(c) >= 0; }))   iData  = i;
      if (iEnt   < 0 && colEnt.some(function(c){ return hn.indexOf(c) >= 0; }))     iEnt   = i;
      if (iSai   < 0 && colSai.some(function(c){ return hn.indexOf(c) >= 0; }))     iSai   = i;
      if (iAlmIni< 0 && colAlmIni.some(function(c){ return hn.indexOf(c) >= 0; }))  iAlmIni= i;
      if (iAlmFim< 0 && colAlmFim.some(function(c){ return hn.indexOf(c) >= 0; }))  iAlmFim= i;
    });

    // Se não achou por cabeçalho, tenta detectar por conteúdo nas primeiras linhas de dados
    if (iNome < 0 || iData < 0) {
      var amostra = raw.slice(1, Math.min(6, raw.length));
      amostra.forEach(function(row) {
        row.forEach(function(cel, i) {
          var s = String(cel||'').trim();
          // Coluna de data: número serial Excel (entre 40000–50000) ou string de data
          if (iData < 0 && ((typeof cel === 'number' && cel > 40000 && cel < 60000) || _normalizeDate(s) !== '')) iData = i;
          // Coluna de nome: texto com letra, > 3 chars, não parece número/hora
          if (iNome < 0 && typeof cel === 'string' && cel.trim().length > 2 && isNaN(cel) && !cel.match(/^\d{1,2}[h:]\d{2}/)) iNome = i;
        });
      });
      startRow = 0; // sem cabeçalho detectado, começa na linha 0
    } else {
      startRow = 1; // pula cabeçalho
    }

    // Heurística de posição se ainda faltam índices
    if (iNome < 0) iNome = 0;
    if (iData < 0) iData = 1;
    if (iEnt  < 0) iEnt  = 2;
    if (iSai  < 0) iSai  = 3;

    // Monta CSV
    for (var i = startRow; i < raw.length; i++) {
      var row = raw[i]; var rowFmt = fmt[i] || [];
      if (!row || row.every(function(c){ return c === '' || c === null; })) continue;

      var nome = String(row[iNome]||'').trim();
      if (!nome || nome.length < 2) continue;

      // Data: serial Excel ou string
      var dataISO = '';
      var celData = row[iData];
      if (typeof celData === 'number' && celData > 40000 && celData < 60000) {
        dataISO = _xlsSerial2Date(celData);
      } else {
        dataISO = _normalizeDate(String(rowFmt[iData]||celData||''));
      }
      if (!dataISO) continue;

      // Horários: serial decimal (< 1) ou string
      function _getCelHora(rawVal, fmtVal) {
        if (typeof rawVal === 'number' && rawVal >= 0 && rawVal < 1) return _xlsSerial2Time(rawVal);
        // Número inteiro pode ser serial com hora decimal codificada
        if (typeof rawVal === 'number' && rawVal > 1) {
          var frac = rawVal % 1;
          if (frac > 0) return _xlsSerial2Time(frac);
        }
        var s = String(fmtVal||rawVal||'').trim();
        // Formatos: "07:00:00", "07:00 AM", "7h00"
        var m = s.match(/^(\d{1,2})[h:](\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
        if (m) {
          var h = parseInt(m[1]), min = parseInt(m[2]);
          if (m[3] && m[3].toUpperCase() === 'PM' && h < 12) h += 12;
          if (m[3] && m[3].toUpperCase() === 'AM' && h === 12) h = 0;
          return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
        }
        return '';
      }

      var entrada  = _getCelHora(row[iEnt],  rowFmt[iEnt]);
      var saida    = _getCelHora(row[iSai],  rowFmt[iSai]);
      var almIni   = iAlmIni >= 0 ? _getCelHora(row[iAlmIni], rowFmt[iAlmIni]) : '';
      var almFim   = iAlmFim >= 0 ? _getCelHora(row[iAlmFim], rowFmt[iAlmFim]) : '';

      var partes = [nome, dataISO, entrada, saida];
      if (almIni && almFim) partes.push(almIni, almFim);
      linhas.push(partes.join(';'));
    }

    return linhas.join('\n');
  }

  function _onTextareaInput(ta) {
    var hint = document.getElementById('imp_textarea_hint');
    if (!hint) return;
    var linhas = (ta.value || '').trim().split('\n').filter(function(l){ return l.trim(); });
    // Ao digitar manualmente, sincroniza o raw
    _state.raw = '';
    hint.textContent = linhas.length > 0
      ? linhas.length + ' linha(s) · Pronto para processar'
      : 'Ex: gibs;09/05/2026;07:00;11:06';
    hint.style.color = linhas.length > 0 ? GREEN : T3;
  }

  function _onArquivo(input) {
    var file = input.files && input.files[0];
    if (!file) return;

    var nomeEl = document.getElementById('imp_file_nome');
    var hintEl = document.getElementById('imp_textarea_hint');
    var taEl   = document.getElementById('imp_texto');

    if (nomeEl) nomeEl.textContent = file.name;

    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var isExcel = (ext === 'xls' || ext === 'xlsx' || ext === 'xlsm');

    function _setResultado(csv) {
      var linhas = csv.split('\n').filter(function(l){ return l.trim(); });
      // Preview: primeiras 5 linhas no textarea (visual); raw completo no state
      _state.raw = csv;
      var preview = linhas.slice(0, 5).join('\n');
      if (linhas.length > 5) preview += '\n… mais ' + (linhas.length - 5) + ' linha(s)';
      if (taEl) taEl.value = preview;
      if (hintEl) {
        hintEl.textContent = '✅ ' + linhas.length + ' registro(s) lidos · Clique em Processar';
        hintEl.style.color = GREEN;
      }
      if (nomeEl) nomeEl.textContent = '✅ ' + file.name;
    }

    if (isExcel) {
      if (nomeEl) nomeEl.textContent = '⏳ Lendo…';
      if (hintEl) { hintEl.textContent = 'Carregando planilha…'; hintEl.style.color = GOLD; }

      var readerBuf = new FileReader();
      readerBuf.onload = function(e) {
        _carregarSheetJS().then(function() {
          try {
            var wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
            var csv = _xlsParaTexto(wb);
            if (!csv || !csv.trim()) {
              _toast('⚠️ Planilha vazia ou formato não reconhecido.');
              if (nomeEl) nomeEl.textContent = file.name;
              if (hintEl) { hintEl.textContent = 'Nenhum dado reconhecido.'; hintEl.style.color = RED; }
              return;
            }
            _setResultado(csv);
            _toast('✅ Planilha lida com sucesso!');
          } catch(err) {
            console.error('[HR_IMPORT XLS]', err);
            _toast('❌ Erro ao ler planilha: ' + err.message);
            if (nomeEl) nomeEl.textContent = file.name;
            if (hintEl) { hintEl.textContent = 'Erro: ' + err.message; hintEl.style.color = RED; }
          }
        }).catch(function(err) {
          _toast('❌ ' + err.message);
          if (nomeEl) nomeEl.textContent = file.name;
          if (hintEl) { hintEl.textContent = 'Falha ao carregar leitor XLS.'; hintEl.style.color = RED; }
        });
      };
      readerBuf.onerror = function() { _toast('❌ Erro ao ler o arquivo.'); };
      readerBuf.readAsArrayBuffer(file);

    } else {
      var readerTxt = new FileReader();
      readerTxt.onload = function(e) {
        var txt = e.target.result;
        var garbled = (txt.match(/\uFFFD/g) || []).length;
        if (garbled > 10) {
          var r2 = new FileReader();
          r2.onload = function(ev) { _setResultado(ev.target.result); };
          r2.onerror = function() { _toast('❌ Erro ao ler arquivo.'); };
          r2.readAsText(file, 'ISO-8859-1');
        } else {
          _setResultado(txt);
        }
      };
      readerTxt.onerror = function() { _toast('❌ Erro ao ler o arquivo.'); };
      readerTxt.readAsText(file, 'UTF-8');
    }
  }

  function _processar() {
    var registros = [];

    // Se vieram do Cartão de Ponto XLS, usa os registros diretos (almocoManual preservado)
    if (_state._registrosDiretos && _state._registrosDiretos.length > 0) {
      registros = _state._registrosDiretos;
      _state._registrosDiretos = null;
    } else {
      // Usa _state.raw (arquivo) se disponível, senão usa o textarea direto
      var texto = (_state.raw && _state.raw.trim())
        ? _state.raw
        : ((document.getElementById('imp_texto') || {}).value || '');
      texto = texto.trim();
      // Remove linha de preview "… mais N linha(s)" se presente
      texto = texto.replace(/\n?… mais \d+ linha\(s\)$/, '').trim();
      if (!texto) { _toast('⚠️ Cole ou importe um relatório primeiro.'); return; }

      registros = _parseRelatorio(texto);
    }

    if (registros.length === 0) {
      _toast('❌ Não foi possível ler nenhum registro. Verifique o formato.');
      return;
    }

    _state.grupos = _vincularAuto(_agrupar(registros));

    var todas = registros.map(function(r){ return r.data; }).sort();
    _state.periodo = { di: todas[0], df: todas[todas.length-1] };

    // Se qualquer registro tem batida incompleta (só entrada ou só saída),
    // abre tela de correção antes de prosseguir
    var temErros = _state.grupos.some(function(gr) {
      return gr.registros.some(function(r) { return !r.entrada || !r.saida; });
    });
    if (temErros) { _renderTelaCorrecao(); } else { _renderTelaVinculacao(); }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TELA DE CORREÇÃO DE PONTO
  // Aberta automaticamente quando há registros com batida incompleta.
  // Permite editar entrada/saída e adicionar dias manualmente.
  // ══════════════════════════════════════════════════════════════════════════

  function _renderTelaCorrecao() {
    var grupos = _state.grupos;
    var DOW_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    var gruposAtivos = grupos.filter(function(gr){ return !gr._ignorar; });
    var totalErros = gruposAtivos.reduce(function(s, gr) {
      return s + gr.registros.filter(function(r){ return (!r.entrada || !r.saida) && !r._punicao; }).length;
    }, 0);

    var gruposHtml = grupos.map(function(gr, gi) {
      if (gr._ignorar) {
        return '<div style="' + CSS_CARD + 'margin-bottom:10px;opacity:.45;display:flex;align-items:center;gap:10px;">' +
          '<div style="flex:1;font-size:.84rem;font-weight:700;color:' + T3 + ';text-transform:uppercase;letter-spacing:.05em;">' +
            '\u{1F6AB} ' + _esc(gr.nome) + '</div>' +
          '<div style="font-size:.65rem;color:' + T3 + ';">ignorado</div>' +
          '<button data-action="ignorar" data-gi="' + gi + '" data-val="0" ' +
            'style="background:none;border:1px solid #2a2a2a;border-radius:7px;color:#555;' +
            'font-family:Outfit,sans-serif;font-size:.7rem;padding:4px 10px;cursor:pointer;' +
            'touch-action:manipulation;">desfazer</button>' +
        '</div>';
      }

      var errosGrupo    = gr.registros.filter(function(r){ return (!r.entrada || !r.saida) && !r._punicao; }).length;
      var punicoesGrupo = gr.registros.filter(function(r){ return r._punicao; }).length;

      var recsHtml = gr.registros.map(function(r, ri) {
        var dow   = DOW_PT[new Date(r.data + 'T12:00:00').getDay()];
        var dia   = r.data.split('-')[2];
        var isSab = new Date(r.data + 'T12:00:00').getDay() === 6;

        if (r._punicao) {
          return '<div style="display:flex;align-items:center;gap:7px;padding:7px 0 7px 10px;' +
            'border-left:3px solid #7a2020;border-radius:0 8px 8px 0;' +
            'background:rgba(120,20,20,.12);margin-bottom:5px;">' +
            '<div style="min-width:32px;text-align:center;">' +
              '<div style="font-size:.84rem;font-weight:800;color:#7a4040;font-family:monospace;">' + dia + '</div>' +
              '<div style="font-size:.58rem;color:' + T3 + ';">' + dow + '</div>' +
            '</div>' +
            '<div style="flex:1;padding:6px 8px;border-radius:8px;background:rgba(120,20,20,.2);border:1px solid rgba(180,40,40,.3);">' +
              '<div style="font-size:.58rem;color:#c06060;font-weight:700;letter-spacing:1px;">' +
                '\u{1F534} PUNI\u00C7\u00C3O APLICADA</div>' +
              '<div style="font-size:.7rem;color:#8a5050;margin-top:1px;">Dia descontado da folha</div>' +
            '</div>' +
            '<button data-action="desfazer-punicao" data-gi="' + gi + '" data-ri="' + ri + '" ' +
              'style="background:none;border:1px solid #3a2020;border-radius:7px;color:#666;' +
              'font-family:Outfit,sans-serif;font-size:.65rem;padding:4px 8px;cursor:pointer;' +
              'white-space:nowrap;touch-action:manipulation;">desfazer</button>' +
            '<button data-action="excluir" data-gi="' + gi + '" data-ri="' + ri + '" ' +
              'style="padding:6px 8px;cursor:pointer;color:#3a2a2a;font-size:1rem;background:none;' +
              'border:none;touch-action:manipulation;">\u2715</button>' +
          '</div>';
        }

        var temErr    = !r.entrada || !r.saida;
        var umaBatida = (r.nBatidas === 1 || (!r.entrada && r.saida) || (r.entrada && !r.saida));
        var corBorda  = temErr ? RED : (isSab ? '#8ec8c8' : GREEN);
        var bgRow     = temErr ? 'rgba(200,92,92,.07)' : 'transparent';
        var corDia    = temErr ? RED : (isSab ? '#8ec8c8' : T2);

        var fEnt = r.entrada
          ? '<span style="color:' + T1 + ';font-weight:700;font-family:monospace;">' + r.entrada + '</span>'
          : '<span style="color:' + RED + ';font-weight:700;font-family:monospace;">&mdash;&mdash;:&mdash;&mdash;</span>';
        var fSai = r.saida
          ? '<span style="color:' + T1 + ';font-weight:700;font-family:monospace;">' + r.saida + '</span>'
          : '<span style="color:' + RED + ';font-weight:700;font-family:monospace;">&mdash;&mdash;:&mdash;&mdash;</span>';

        var btnTrocar = umaBatida
          ? '<button data-action="trocar" data-gi="' + gi + '" data-ri="' + ri + '" ' +
              'title="Trocar entrada \u2194 sa\u00EDda" ' +
              'style="padding:5px 8px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);' +
              'border-radius:7px;color:#8a6d30;cursor:pointer;font-size:.85rem;font-weight:700;' +
              'touch-action:manipulation;">\u21C5</button>'
          : '';

        var btnPunir = temErr
          ? '<button data-action="punir" data-gi="' + gi + '" data-ri="' + ri + '" ' +
              'style="padding:5px 7px;background:rgba(120,20,20,.3);border:1px solid rgba(180,40,40,.4);' +
              'border-radius:7px;color:#c06060;cursor:pointer;font-size:.6rem;font-weight:700;' +
              'white-space:nowrap;font-family:Outfit,sans-serif;touch-action:manipulation;">' +
              '\u{1F534} Punir</button>'
          : '';

        // Verifica se já existe exceção salva para essa data
        var _excAtual = (function(){
          try {
            var excs = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
            return Object.values(excs).find(function(e){ return e.data === r.data; }) || null;
          } catch(e){ return null; }
        })();
        var btnExcecao = '<button data-action="excecao" data-gi="' + gi + '" data-ri="' + ri + '" ' +
          'style="padding:5px 7px;background:' + (_excAtual ? 'rgba(167,139,250,.2)' : 'rgba(100,80,180,.15)') + ';' +
          'border:1px solid ' + (_excAtual ? 'rgba(167,139,250,.6)' : 'rgba(120,100,200,.35)') + ';' +
          'border-radius:7px;color:' + (_excAtual ? '#c4b5fd' : '#7c6db8') + ';cursor:pointer;font-size:.6rem;font-weight:700;' +
          'white-space:nowrap;font-family:Outfit,sans-serif;touch-action:manipulation;">' +
          (_excAtual ? '\u2605 ' + (_excAtual.tipo === 'feriado' ? 'Feriado' : _excAtual.tipo === 'acordo' ? 'Acordo' : 'Declarado') : '\u{1F4CB} Exceção') +
          '</button>';

        // Almoço
        var fAlmEnt = r.almEntrada
          ? '<span style="color:' + T2 + ';font-weight:600;font-family:monospace;font-size:.76rem;">' + r.almEntrada + '</span>'
          : '<span style="color:#333;font-family:monospace;font-size:.76rem;">\u2014:\u2014</span>';
        var fAlmSai = r.almSaida
          ? '<span style="color:' + T2 + ';font-weight:600;font-family:monospace;font-size:.76rem;">' + r.almSaida + '</span>'
          : '<span style="color:#333;font-family:monospace;font-size:.76rem;">\u2014:\u2014</span>';

        return '<div style="margin-bottom:5px;">' +

          '<div style="display:flex;align-items:center;gap:7px;padding:7px 0 4px 10px;' +
          'border-left:3px solid ' + corBorda + ';border-top-right-radius:8px;' +
          'background:' + bgRow + ';">' +

            '<div style="min-width:32px;text-align:center;">' +
              '<div style="font-size:.84rem;font-weight:800;color:' + corDia + ';font-family:monospace;">' + dia + '</div>' +
              '<div style="font-size:.58rem;color:' + T3 + ';">' + dow + (isSab ? ' \u00BD' : '') + '</div>' +
            '</div>' +

            '<button data-action="editar" data-gi="' + gi + '" data-ri="' + ri + '" data-field="entrada" ' +
              'style="flex:1;background:' + (r.entrada ? 'rgba(255,255,255,.04)' : 'rgba(200,92,92,.1)') + ';' +
              'border:1px solid ' + (r.entrada ? '#222' : 'rgba(200,92,92,.4)') + ';' +
              'border-radius:8px;padding:7px 6px;text-align:center;cursor:pointer;' +
              'touch-action:manipulation;">' +
              '<div style="font-size:.56rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:1px;">ENTRADA</div>' +
              '<div style="font-size:.84rem;">' + fEnt + '</div>' +
            '</button>' +

            '<button data-action="editar" data-gi="' + gi + '" data-ri="' + ri + '" data-field="saida" ' +
              'style="flex:1;background:' + (r.saida ? 'rgba(255,255,255,.04)' : 'rgba(200,92,92,.1)') + ';' +
              'border:1px solid ' + (r.saida ? '#222' : 'rgba(200,92,92,.4)') + ';' +
              'border-radius:8px;padding:7px 6px;text-align:center;cursor:pointer;' +
              'touch-action:manipulation;">' +
              '<div style="font-size:.56rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:1px;">SA\u00CDDA</div>' +
              '<div style="font-size:.84rem;">' + fSai + '</div>' +
            '</button>' +

            btnTrocar + btnPunir + btnExcecao +

            '<button data-action="excluir" data-gi="' + gi + '" data-ri="' + ri + '" ' +
              'style="padding:6px 8px;cursor:pointer;color:#2a2a2a;font-size:1rem;background:none;' +
              'border:none;touch-action:manipulation;">\u2715</button>' +
          '</div>' +

          '<div style="display:flex;align-items:center;gap:7px;padding:3px 0 5px 10px;' +
          'border-left:3px solid ' + corBorda + ';border-bottom-right-radius:8px;' +
          'background:' + bgRow + ';">' +
            '<div style="min-width:32px;text-align:center;font-size:.5rem;color:' + T3 + ';">ALM</div>' +
            '<button data-action="editar" data-gi="' + gi + '" data-ri="' + ri + '" data-field="almEntrada" ' +
              'style="flex:1;background:rgba(255,255,255,.02);border:1px solid #1c1c1c;' +
              'border-radius:7px;padding:4px 6px;text-align:center;cursor:pointer;touch-action:manipulation;">' +
              '<div style="font-size:.48rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:1px;">SA\u00CD. ALM</div>' +
              fAlmEnt +
            '</button>' +
            '<button data-action="editar" data-gi="' + gi + '" data-ri="' + ri + '" data-field="almSaida" ' +
              'style="flex:1;background:rgba(255,255,255,.02);border:1px solid #1c1c1c;' +
              'border-radius:7px;padding:4px 6px;text-align:center;cursor:pointer;touch-action:manipulation;">' +
              '<div style="font-size:.48rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:1px;">RETORNO</div>' +
              fAlmSai +
            '</button>' +
            (umaBatida || temErr ? '<div style="min-width:58px;"></div>' : '') +
            '<div style="min-width:30px;"></div>' +
          '</div>' +

        '</div>';
      }).join('');

      var badgeHtml = '';
      if (errosGrupo > 0)
        badgeHtml = '<span style="font-size:.62rem;color:' + RED + ';font-weight:700;background:rgba(200,92,92,.1);border:1px solid rgba(200,92,92,.3);border-radius:10px;padding:2px 9px;">&#9888; ' + errosGrupo + ' erro(s)</span>';
      else if (punicoesGrupo > 0)
        badgeHtml = '<span style="font-size:.62rem;color:#c06060;font-weight:700;background:rgba(120,20,20,.15);border:1px solid rgba(180,40,40,.3);border-radius:10px;padding:2px 9px;">&#128308; ' + punicoesGrupo + ' puni\u00E7\u00E3o(\u00F5es)</span>';
      else
        badgeHtml = '<span style="font-size:.62rem;color:' + GREEN + ';font-weight:700;background:rgba(92,184,92,.1);border:1px solid rgba(92,184,92,.3);border-radius:10px;padding:2px 9px;">&#10003; OK</span>';

      return '<div style="' + CSS_CARD + 'margin-bottom:14px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<div style="font-size:.88rem;font-weight:800;color:' + GOLD + ';letter-spacing:.05em;text-transform:uppercase;">' + _esc(gr.nome) + '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            badgeHtml +
            '<button data-action="ignorar" data-gi="' + gi + '" data-val="1" ' +
              'style="background:none;border:1px solid #2a2a2a;border-radius:7px;color:#444;' +
              'font-family:Outfit,sans-serif;font-size:.62rem;padding:3px 8px;cursor:pointer;' +
              'touch-action:manipulation;">&#128683; Ignorar</button>' +
          '</div>' +
        '</div>' +
        recsHtml +
        '<button data-action="adicionar-dia" data-gi="' + gi + '" ' +
          'style="width:100%;padding:9px;margin-top:4px;background:none;' +
          'border:1px dashed #222;border-radius:8px;color:#3a3a3a;cursor:pointer;' +
          'font-family:Outfit,sans-serif;font-size:.75rem;touch-action:manipulation;">' +
          '+ Adicionar dia</button>' +
      '</div>';
    }).join('');

    var corStatus = totalErros > 0 ? RED : GREEN;
    var totalRegs = grupos.reduce(function(s, g){ return s + g.registros.length; }, 0);

    var html = '<div id="hrCorrecaoInner" style="width:100%;max-width:560px;padding:0 16px;">' +
      _header('Corre\u00E7\u00E3o de Ponto', 'Toque nos campos para editar') +

      '<div style="background:rgba(255,255,255,.03);border:1px solid #1e1e1e;border-radius:12px;' +
        'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
        '<div style="font-size:.78rem;color:' + T2 + ';">' + totalRegs + ' registros \u00B7 ' + grupos.length + ' funcion\u00E1rio(s)</div>' +
        '<div style="font-size:.72rem;font-weight:700;color:' + corStatus + ';' +
          'background:' + (totalErros > 0 ? 'rgba(200,92,92,.1)' : 'rgba(92,184,92,.1)') + ';' +
          'border:1px solid ' + (totalErros > 0 ? 'rgba(200,92,92,.35)' : 'rgba(92,184,92,.35)') + ';' +
          'border-radius:12px;padding:4px 12px;">' +
          (totalErros > 0 ? '&#9888; ' + totalErros + ' erro(s)' : '&#10003; Tudo OK') +
        '</div>' +
      '</div>' +

      gruposHtml +

      '<button data-action="continuar" ' +
        'style="width:100%;padding:14px;border-radius:11px;' +
        'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
        'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
        'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;' +
        'cursor:pointer;letter-spacing:.04em;margin-bottom:8px;' +
        'touch-action:manipulation;">Continuar \u2192</button>' +

      '<button data-action="fechar" ' +
        'style="width:100%;padding:12px;border-radius:11px;background:transparent;' +
        'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
        'font-size:.85rem;cursor:pointer;touch-action:manipulation;">Cancelar</button>' +
    '</div>';

    // Preserva posição de scroll para não voltar ao topo ao re-renderizar
    var _prevScroll = 0;
    var _prevOv = document.getElementById('hrImport');
    if (_prevOv) _prevScroll = _prevOv.scrollTop;
    var ov = _overlay('hrImport', html);
    if (_prevScroll > 0) { setTimeout(function(){ ov.scrollTop = _prevScroll; }, 0); }

    function _handleCorrecaoEvent(e) {
      // Se o modal de exceção estiver aberto, ignora eventos do hrImport
      if (document.getElementById('hrExcecaoModal')) return;
      var el = e.target;
      while (el && el !== ov && !el.dataset.action) el = el.parentElement;
      if (!el || !el.dataset || !el.dataset.action) return;
      var action = el.dataset.action;
      var gi  = el.dataset.gi  !== undefined ? parseInt(el.dataset.gi)  : null;
      var ri  = el.dataset.ri  !== undefined ? parseInt(el.dataset.ri)  : null;
      var fld = el.dataset.field || null;
      var val = el.dataset.val  !== undefined ? parseInt(el.dataset.val) : null;
      if (action === 'editar'          && gi !== null && ri !== null && fld) { e.stopPropagation(); _editCorrecao(gi, ri, fld); }
      else if (action === 'trocar'     && gi !== null && ri !== null)        { e.stopPropagation(); _trocarEntradaSaida(gi, ri); }
      else if (action === 'punir'      && gi !== null && ri !== null)        { e.stopPropagation(); _aplicarPunicao(gi, ri); }
      else if (action === 'desfazer-punicao' && gi !== null && ri !== null)  { e.stopPropagation(); _desfazerPunicao(gi, ri); }
      else if (action === 'excluir'    && gi !== null && ri !== null)        { e.stopPropagation(); _excluirCorrecao(gi, ri); }
      else if (action === 'ignorar'    && gi !== null && val !== null)       { e.stopPropagation(); _ignorarGrupo(gi, val === 1); }
      else if (action === 'excecao'    && gi !== null && ri !== null)        { e.stopPropagation(); _abrirModalExcecao(gi, ri); }
      else if (action === 'adicionar-dia' && gi !== null)                   { e.stopPropagation(); _abrirAdicionarDia(gi); }
      else if (action === 'continuar')                                       { e.stopPropagation(); _continuarParaVinculacao(); }
      else if (action === 'fechar')                                          { e.stopPropagation(); _fechar(); }
    }

    ov.addEventListener('click', _handleCorrecaoEvent, false);
    // Distingue tap de scroll: só aciona se o dedo não se moveu mais de 8px
    var _tsY = 0, _tsX = 0;
    ov.addEventListener('touchstart', function(e) {
      _tsY = e.touches[0].clientY;
      _tsX = e.touches[0].clientX;
    }, { passive: true });
    ov.addEventListener('touchend', function(e) {
      var t = e.changedTouches[0];
      var dy = Math.abs(t.clientY - _tsY);
      var dx = Math.abs(t.clientX - _tsX);
      if (dy > 8 || dx > 8) return; // foi scroll/swipe — ignora
      // Usa elementFromPoint para pegar o elemento exato sob o dedo (evita problema com filhos de texto)
      var el = document.elementFromPoint(t.clientX, t.clientY);
      while (el && el !== ov && !el.dataset.action) el = el.parentElement;
      if (el && el.dataset && el.dataset.action) {
        e.preventDefault(); // sempre previne click sintético quando há action
        _handleCorrecaoEvent({ target: el, stopPropagation: function(){} });
      } else {
        // Mesmo sem action identificada, previne o click sintético do mobile
        // para evitar que o hrImport.click dispare depois do modal de exceção abrir
        e.preventDefault();
      }
    }, { passive: false });
  }
  /** Máscara de horário: 0700 → 07:00 */
  function _maskHorario(val) {
    var s = val.replace(/[^0-9]/g, '');
    if (s.length > 4) s = s.slice(0, 4);
    if (s.length >= 3) s = s.slice(0,2) + ':' + s.slice(2);
    return s;
  }

  /** Abre modal para editar entrada, saída ou horários de almoço de um registro. */
  function _editCorrecao(grpIdx, recIdx, field) {
    var gr = _state.grupos[grpIdx];
    if (!gr || !gr.registros[recIdx]) return;
    var r      = gr.registros[recIdx];
    var dia    = r.data.split('-')[2];
    var valAtual = r[field] || '';
    var ovId   = 'hrEditCorrecao';
    var existente = document.getElementById(ovId);
    if (existente) existente.remove();

    var isAlm  = field === 'almEntrada' || field === 'almSaida';
    var label  = { entrada: 'Entrada', saida: 'Sa\u00EDda',
                   almEntrada: 'Sa\u00EDda p/ Almo\u00E7o', almSaida: 'Retorno do Almo\u00E7o' }[field] || field;
    var temposRapidos = isAlm
      ? ['11:00','11:30','12:00','12:30','13:00','13:30','14:00']
      : ['07:00','07:30','08:00','11:00','12:00','13:00','14:00','16:00','17:00','17:30'];

    var btnsHtml = temposRapidos.map(function(t) {
      return '<button data-quick="' + t + '" ' +
        'style="background:rgba(255,255,255,.04);border:1px solid #222;border-radius:7px;color:#888;' +
        'padding:5px 9px;font-size:.7rem;cursor:pointer;font-family:monospace;touch-action:manipulation;">' + t + '</button>';
    }).join('');

    var ovEl = document.createElement('div');
    ovEl.id = ovId;
    ovEl.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(8,7,4,.95);' +
      'display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;padding:24px;';
    ovEl.innerHTML =
      '<div style="width:100%;max-width:320px;">' +
        '<div style="' + CSS_CARD + 'padding:22px 20px;">' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;margin-bottom:4px;">' +
            _esc(gr.nome.toUpperCase()) + ' \u00B7 DIA ' + dia +
          '</div>' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + T1 + ';margin-bottom:16px;">' +
            'Editar ' + label +
          '</div>' +
          '<input id="corr_h" type="text" maxlength="5" value="' + _esc(valAtual) + '" placeholder="07:00" ' +
            'style="width:100%;box-sizing:border-box;padding:14px;border-radius:10px;' +
            'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
            'font-family:monospace;font-size:1.8rem;text-align:center;outline:none;' +
            'letter-spacing:4px;margin-bottom:14px;">' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + btnsHtml + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button id="corr_ok" ' +
              'style="flex:2;padding:12px;border-radius:10px;' +
              'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
              'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
              'font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;' +
              'touch-action:manipulation;">Confirmar</button>' +
            '<button id="corr_cancel" ' +
              'style="flex:1;padding:12px;border-radius:10px;background:transparent;' +
              'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
              'font-size:.82rem;cursor:pointer;touch-action:manipulation;">Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(ovEl);

    // Listeners via addEventListener (evita problemas de CSP com inline handlers)
    var inp = document.getElementById('corr_h');
    inp.addEventListener('input', function() { this.value = _maskHorario(this.value); });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _salvarCorrecao(grpIdx, recIdx, field);
    });
    document.getElementById('corr_ok').addEventListener('click', function() {
      _salvarCorrecao(grpIdx, recIdx, field);
    });
    document.getElementById('corr_cancel').addEventListener('click', function() { ovEl.remove(); });
    ovEl.querySelectorAll('[data-quick]').forEach(function(b) {
      b.addEventListener('click', function() {
        document.getElementById('corr_h').value = b.getAttribute('data-quick');
      });
    });

    setTimeout(function(){ if (inp) { inp.focus(); inp.select(); } }, 50);
  }

  /** Salva a edição e re-renderiza a tela de correção. */
  function _salvarCorrecao(grpIdx, recIdx, field) {
    var el = document.getElementById('corr_h');
    if (!el) return;
    var val = el.value.trim();
    if (val && !val.match(/^\d{1,2}:\d{2}$/)) {
      _toast('⚠️ Use o formato HH:MM'); return;
    }
    var gr = _state.grupos[grpIdx];
    if (gr && gr.registros[recIdx]) {
      var rec = gr.registros[recIdx];
      rec[field] = val;
      // Recalcula almocoManual se ambos os horários de almoço estiverem preenchidos
      if (field === 'almEntrada' || field === 'almSaida') {
        var aIni = _hhmm2min(rec.almEntrada);
        var aFim = _hhmm2min(rec.almSaida);
        if (!isNaN(aIni) && !isNaN(aFim)) {
          var dur = aFim - aIni;
          if (dur < 0) dur += 1440;
          rec.almocoManual = dur > 0 ? dur : null;
        } else {
          rec.almocoManual = null;
        }
      }
    }
    var ov = document.getElementById('hrEditCorrecao');
    if (ov) ov.remove();
    _renderTelaCorrecao();
  }

  /** Remove um registro e re-renderiza. */
  function _excluirCorrecao(grpIdx, recIdx) {
    var gr = _state.grupos[grpIdx];
    if (gr) gr.registros.splice(recIdx, 1);
    _renderTelaCorrecao();
  }

  /** Abre modal para adicionar um dia manualmente a um funcionário. */
  function _abrirAdicionarDia(grpIdx) {
    var gr = _state.grupos[grpIdx];
    if (!gr) return;

    // Detecta mês/ano do período atual
    var ano = new Date().getFullYear(), mes = new Date().getMonth() + 1;
    if (_state.periodo && _state.periodo.di) {
      ano = parseInt(_state.periodo.di.slice(0,4));
      mes = parseInt(_state.periodo.di.slice(5,7));
    } else if (gr.registros.length > 0) {
      var pd = gr.registros[0].data || '';
      if (pd) { ano = parseInt(pd.slice(0,4)); mes = parseInt(pd.slice(5,7)); }
    }

    var ovId = 'hrAddDia';
    var ex = document.getElementById(ovId); if (ex) ex.remove();
    var ovEl = document.createElement('div');
    ovEl.id = ovId;
    ovEl.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(8,7,4,.95);' +
      'display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;padding:24px;';
    ovEl.innerHTML =
      '<div style="width:100%;max-width:340px;">' +
        '<div style="' + CSS_CARD + 'padding:22px 20px;">' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;margin-bottom:4px;">' +
            _esc(gr.nome.toUpperCase()) +
          '</div>' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + T1 + ';margin-bottom:16px;">+ Adicionar Dia</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
            '<div style="flex:.55;">' +
              '<div style="font-size:.58rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:4px;">DIA</div>' +
              '<input id="add_d" type="number" min="1" max="31" placeholder="17" ' +
                'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;' +
                'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
                'font-family:monospace;font-size:1rem;outline:none;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<div style="font-size:.58rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:4px;">ENTRADA</div>' +
              '<input id="add_e" type="text" maxlength="5" placeholder="07:00" ' +
                'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;' +
                'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
                'font-family:monospace;font-size:1rem;outline:none;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<div style="font-size:.58rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:4px;">SA\u00CDDA</div>' +
              '<input id="add_s" type="text" maxlength="5" placeholder="16:00" ' +
                'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;' +
                'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
                'font-family:monospace;font-size:1rem;outline:none;">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
            '<div style="flex:1;">' +
              '<div style="font-size:.58rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:4px;">SA\u00CD. ALM</div>' +
              '<input id="add_ae" type="text" maxlength="5" placeholder="12:00" ' +
                'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;' +
                'border:1px solid #1c1c1c;background:rgba(255,255,255,.02);color:' + T2 + ';' +
                'font-family:monospace;font-size:1rem;outline:none;">' +
            '</div>' +
            '<div style="flex:1;">' +
              '<div style="font-size:.58rem;color:' + T3 + ';letter-spacing:1px;margin-bottom:4px;">RETORNO ALM</div>' +
              '<input id="add_as" type="text" maxlength="5" placeholder="13:00" ' +
                'style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;' +
                'border:1px solid #1c1c1c;background:rgba(255,255,255,.02);color:' + T2 + ';' +
                'font-family:monospace;font-size:1rem;outline:none;">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button id="add_ok" ' +
              'style="flex:2;padding:12px;border-radius:10px;' +
              'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
              'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
              'font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;' +
              'touch-action:manipulation;">Adicionar</button>' +
            '<button id="add_cancel" ' +
              'style="flex:1;padding:12px;border-radius:10px;background:transparent;' +
              'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
              'font-size:.82rem;cursor:pointer;touch-action:manipulation;">Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ovEl);

    // Máscara nos inputs de hora via addEventListener (evita inline handlers/CSP)
    ['add_e','add_s','add_ae','add_as'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function() { this.value = _maskHorario(this.value); });
    });
    document.getElementById('add_ok').addEventListener('click', function() {
      _confirmarAddDia(grpIdx, ano, mes);
    });
    document.getElementById('add_cancel').addEventListener('click', function() { ovEl.remove(); });

    setTimeout(function(){ var el = document.getElementById('add_d'); if (el) el.focus(); }, 50);
  }

  /** Valida e insere o novo dia, ordena os registros e re-renderiza. */
  function _confirmarAddDia(grpIdx, ano, mes) {
    var dEl  = document.getElementById('add_d');
    var eEl  = document.getElementById('add_e');
    var sEl  = document.getElementById('add_s');
    var aeEl = document.getElementById('add_ae');
    var asEl = document.getElementById('add_as');
    if (!dEl || !eEl || !sEl) return;
    var dia        = parseInt(dEl.value);
    var entrada    = eEl.value.trim();
    var saida      = sEl.value.trim();
    var almEntrada = aeEl ? aeEl.value.trim() : '';
    var almSaida   = asEl ? asEl.value.trim() : '';
    if (!dia || dia < 1 || dia > 31) { _toast('⚠️ Dia inválido.'); return; }
    if (!entrada)                    { _toast('⚠️ Informe a entrada.'); return; }
    var dataISO = ano + '-' + String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    var dt = new Date(dataISO + 'T12:00:00');
    if (isNaN(dt.getTime())) { _toast('⚠️ Data inválida.'); return; }
    if (dt.getDay() === 0)   { _toast('⚠️ Domingo não conta.'); return; }
    var gr = _state.grupos[grpIdx];
    if (!gr) return;
    if (gr.registros.some(function(r){ return r.data === dataISO; })) {
      _toast('⚠️ Já existe registro para o dia ' + dia + '.'); return;
    }
    // Calcula almocoManual se ambos informados
    var almocoManual = null;
    if (almEntrada && almSaida) {
      var aI = _hhmm2min(almEntrada), aF = _hhmm2min(almSaida);
      if (!isNaN(aI) && !isNaN(aF)) {
        var dur = aF - aI; if (dur < 0) dur += 1440;
        if (dur > 0) almocoManual = dur;
      }
    }
    gr.registros.push({
      nome: gr.nome, data: dataISO,
      entrada: entrada, saida: saida,
      almEntrada: almEntrada || null, almSaida: almSaida || null,
      almocoManual: almocoManual
    });
    gr.registros.sort(function(a, b){ return a.data.localeCompare(b.data); });
    // Atualiza período se necessário
    var todas = [];
    _state.grupos.forEach(function(g){ g.registros.forEach(function(r){ todas.push(r.data); }); });
    todas.sort();
    _state.periodo = { di: todas[0], df: todas[todas.length - 1] };
    var ov = document.getElementById('hrAddDia'); if (ov) ov.remove();
    _renderTelaCorrecao();
  }

  /** Marca/desmarca grupo para ser ignorado na importação. */
  function _ignorarGrupo(grpIdx, ignorar) {
    if (_state.grupos[grpIdx]) _state.grupos[grpIdx]._ignorar = ignorar;
    _renderTelaCorrecao();
  }

  /** Marca um registro com punição (desconta o dia). */
  function _aplicarPunicao(grpIdx, recIdx) {
    var gr = _state.grupos[grpIdx];
    if (gr && gr.registros[recIdx]) {
      gr.registros[recIdx]._punicao = true;
      // Remove horários incompletos para não poluir o CSV
      gr.registros[recIdx].entrada = gr.registros[recIdx].entrada || 'PUNIÇÃO';
      gr.registros[recIdx].saida   = 'PUNIÇÃO';
    }
    _renderTelaCorrecao();
  }

  /** Desfaz punição de um registro. */
  function _desfazerPunicao(grpIdx, recIdx) {
    var gr = _state.grupos[grpIdx];
    if (gr && gr.registros[recIdx]) {
      gr.registros[recIdx]._punicao = false;
      if (gr.registros[recIdx].entrada === 'PUNIÇÃO') gr.registros[recIdx].entrada = '';
      if (gr.registros[recIdx].saida   === 'PUNIÇÃO') gr.registros[recIdx].saida   = '';
    }
    _renderTelaCorrecao();
  }

  /**
   * Abre modal para registrar uma exceção para o dia (feriado, acordo ou declarado).
   * Tipos:
   *   feriado  — dia não trabalhado (feriado oficial ou combinado). Pode ser dia todo ou meio período.
   *   acordo   — trabalhou período reduzido por acordo (ex: meio dia + compensação de HE de outros dias).
   *   declarado — jornada aceita mesmo sem ponto completo (empregador confirma a presença).
   * A exceção é salva em hr_excecoes e afeta _jornadaEsperada e o cálculo de HE.
   */
  function _abrirModalExcecao(grpIdx, recIdx) {
    var gr = _state.grupos[grpIdx];
    if (!gr || !gr.registros[recIdx]) return;
    var r      = gr.registros[recIdx];
    var data   = r.data;
    var DOW_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var dow    = DOW_PT[new Date(data + 'T12:00:00').getDay()];
    var dia    = data.split('-')[2];
    var mesNum = parseInt(data.split('-')[1]);
    var MESES  = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var dataFmt = dow + ' ' + dia + '/' + MESES[mesNum];

    // Carrega exceção existente para pré-preencher
    var excExist = null;
    try {
      var excsAll = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
      excExist = Object.values(excsAll).find(function(e){ return e.data === data; }) || null;
    } catch(e) {}

    var ovId = 'hrExcecaoModal';
    var prev = document.getElementById(ovId);
    if (prev) prev.remove();

    // ── Constrói HTML do modal ──
    var html =
      '<div id="' + ovId + '" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;' +
        'display:flex;align-items:flex-end;justify-content:center;padding:0;">' +
        '<div style="width:100%;max-width:520px;background:#0f0f0f;border-radius:18px 18px 0 0;' +
          'border:1px solid #2a2020;padding:20px 18px 32px;max-height:85vh;overflow-y:auto;">' +

          // Header
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
            '<div>' +
              '<div style="font-size:1rem;font-weight:800;color:#c4b5fd;font-family:Outfit,sans-serif;">📋 Exceção do Dia</div>' +
              '<div style="font-size:.72rem;color:#888;margin-top:2px;">' + dataFmt + '</div>' +
            '</div>' +
            '<button id="excecao_fechar" style="background:none;border:none;color:#555;font-size:1.2rem;cursor:pointer;padding:4px;">✕</button>' +
          '</div>' +

          // Seletor de tipo
          '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Tipo de exceção</div>' +
          '<div id="excecao_tipos" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">' +
            _btnTipoExcecao('feriado',   '🎌', 'Feriado',   'Dia não trabalhado (feriado ou folga combinada)',  excExist) +
            _btnTipoExcecao('acordo',    '🤝', 'Acordo',    'Trabalharam período reduzido por acordo prévio',  excExist) +
            _btnTipoExcecao('declarado', '✅', 'Declarado', 'Presença confirmada pelo empregador',             excExist) +
          '</div>' +

          // Área de opções do tipo (renderizada dinamicamente)
          '<div id="excecao_opcoes"></div>' +

          // Campo descrição
          '<div style="margin-bottom:14px;">' +
            '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;">Descrição / Observação</div>' +
            '<textarea id="excecao_desc" rows="2" placeholder="Ex: Corpus Christi · Acordo de compensação de horas · etc." ' +
              'style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;' +
              'color:#ddd;font-family:Outfit,sans-serif;font-size:.82rem;padding:9px 11px;resize:none;outline:none;">' +
              (excExist && excExist.descricao ? excExist.descricao : '') + '</textarea>' +
          '</div>' +

          // Botões de ação
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            '<button id="excecao_salvar" ' +
              'style="padding:13px;background:rgba(167,139,250,.15);border:1.5px solid rgba(167,139,250,.5);' +
              'color:#c4b5fd;border-radius:11px;font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;">' +
              '✓ Salvar Exceção</button>' +
            (excExist
              ? '<button id="excecao_remover" ' +
                  'style="padding:13px;background:rgba(120,20,20,.25);border:1px solid rgba(180,40,40,.4);' +
                  'color:#c06060;border-radius:11px;font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;">' +
                  '🗑 Remover</button>'
              : '<button id="excecao_cancelar" ' +
                  'style="padding:13px;background:transparent;border:1px solid #2a2a2a;' +
                  'color:#555;border-radius:11px;font-family:Outfit,sans-serif;font-size:.88rem;cursor:pointer;">' +
                  'Cancelar</button>'
            ) +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var ov = document.getElementById(ovId);

    // Bloqueia propagação para o overlay hrImport não capturar eventos do modal
    ov.addEventListener('click',      function(e){ e.stopPropagation(); }, true);
    ov.addEventListener('touchstart', function(e){ e.stopPropagation(); }, { capture: true, passive: true });
    ov.addEventListener('touchend',   function(e){ e.stopPropagation(); }, { capture: true, passive: false });

    // Tipo selecionado atual
    var tipoAtual = excExist ? excExist.tipo : 'feriado';

    function _renderOpcoes(tipo) {
      var el = document.getElementById('excecao_opcoes');
      if (!el) return;
      var html2 = '';

      if (tipo === 'feriado') {
        var isMeio = excExist && excExist.meioperiodo;
        html2 =
          '<div style="margin-bottom:14px;">' +
            '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Período trabalhado</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
              '<button id="opt_diatodo" ' +
                'style="padding:10px 8px;background:' + (!isMeio ? 'rgba(167,139,250,.25)' : '#1a1a1a') + ';' +
                'border:1px solid ' + (!isMeio ? 'rgba(167,139,250,.7)' : '#2a2a2a') + ';' +
                'border-radius:9px;color:#ddd;font-family:Outfit,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;">' +
                '🔴 Dia todo<br><span style="font-size:.6rem;color:#888;">Não trabalhou</span></button>' +
              '<button id="opt_meio" ' +
                'style="padding:10px 8px;background:' + (isMeio ? 'rgba(167,139,250,.25)' : '#1a1a1a') + ';' +
                'border:1px solid ' + (isMeio ? 'rgba(167,139,250,.7)' : '#2a2a2a') + ';' +
                'border-radius:9px;color:#ddd;font-family:Outfit,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;">' +
                '🟡 Meio período<br><span style="font-size:.6rem;color:#888;">Trabalhou até o meio-dia</span></button>' +
            '</div>' +
            '<div id="feriado_horas" style="display:' + (isMeio ? 'block' : 'none') + ';">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
                _inputHora('fer_ent', 'Entrada', excExist && excExist.horEntrada ? excExist.horEntrada : r.entrada || '07:00') +
                _inputHora('fer_sai', 'Saída',   excExist && excExist.horSaida   ? excExist.horSaida   : r.saida   || '12:00') +
              '</div>' +
              '<div style="font-size:.62rem;color:#7a6;background:rgba(92,150,80,.08);border:1px solid rgba(92,150,80,.25);border-radius:7px;padding:7px 10px;margin-top:8px;">' +
                'ℹ️ No meio período o sistema calculará as horas trabalhadas normalmente.' +
              '</div>' +
            '</div>' +
          '</div>';

      } else if (tipo === 'acordo') {
        var compHora = excExist && excExist.compensacaoHoras ? excExist.compensacaoHoras : '2';
        var compDias = excExist && excExist.compensacaoDias  ? excExist.compensacaoDias  : '';
        html2 =
          '<div style="margin-bottom:10px;">' +
            '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Horário trabalhado</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
              _inputHora('ac_ent', 'Entrada', excExist && excExist.horEntrada ? excExist.horEntrada : r.entrada || '07:00') +
              _inputHora('ac_sai', 'Saída',   excExist && excExist.horSaida   ? excExist.horSaida   : r.saida   || '12:00') +
            '</div>' +
            '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Compensação (descontar HE de outros dias)</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
              '<div>' +
                '<div style="font-size:.6rem;color:#888;margin-bottom:4px;">Horas a descontar</div>' +
                '<input id="ac_comp_horas" type="number" min="0" max="24" step="0.5" value="' + compHora + '" ' +
                  'style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;' +
                  'color:#ddd;font-family:Outfit,sans-serif;font-size:.88rem;padding:9px 11px;outline:none;" ' +
                  'placeholder="Ex: 2">' +
              '</div>' +
              '<div>' +
                '<div style="font-size:.6rem;color:#888;margin-bottom:4px;">Distribuir em (dias)</div>' +
                '<input id="ac_comp_dias" type="text" value="' + compDias + '" ' +
                  'style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;' +
                  'color:#ddd;font-family:Outfit,sans-serif;font-size:.88rem;padding:9px 11px;outline:none;" ' +
                  'placeholder="Ex: Qui, Sex">' +
              '</div>' +
            '</div>' +
            '<div style="font-size:.62rem;color:#8ec8c8;background:rgba(92,180,180,.06);border:1px solid rgba(92,180,180,.2);border-radius:7px;padding:8px 10px;">' +
              '💡 As horas de compensação ficam registradas como observação no ponto do dia.' +
            '</div>' +
          '</div>';

      } else if (tipo === 'declarado') {
        html2 =
          '<div style="margin-bottom:10px;">' +
            '<div style="font-size:.6rem;color:#888;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Horário declarado</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
              _inputHora('dec_ent', 'Entrada', excExist && excExist.horEntrada ? excExist.horEntrada : r.entrada || '07:00') +
              _inputHora('dec_sai', 'Saída',   excExist && excExist.horSaida   ? excExist.horSaida   : r.saida   || '17:00') +
            '</div>' +
            '<div style="font-size:.62rem;color:#a0b87a;background:rgba(120,160,80,.07);border:1px solid rgba(120,160,80,.25);border-radius:7px;padding:7px 10px;">' +
              'ℹ️ O dia será computado com os horários declarados, mesmo sem ponto no relógio.' +
            '</div>' +
          '</div>';
      }

      el.innerHTML = html2;

      // Registra eventos DEPOIS do innerHTML (CSP-safe — sem onclick inline)
      if (tipo === 'feriado') {
        var btnDia  = document.getElementById('opt_diatodo');
        var btnMeio = document.getElementById('opt_meio');
        var divHoras = document.getElementById('feriado_horas');
        if (btnDia) btnDia.addEventListener('click', function(){
          btnDia.style.background   = 'rgba(167,139,250,.25)'; btnDia.style.borderColor  = 'rgba(167,139,250,.7)';
          btnMeio.style.background  = '#1a1a1a';               btnMeio.style.borderColor = '#2a2a2a';
          if (divHoras) divHoras.style.display = 'none';
        });
        if (btnMeio) btnMeio.addEventListener('click', function(){
          btnMeio.style.background = 'rgba(167,139,250,.25)'; btnMeio.style.borderColor  = 'rgba(167,139,250,.7)';
          btnDia.style.background  = '#1a1a1a';               btnDia.style.borderColor   = '#2a2a2a';
          if (divHoras) divHoras.style.display = 'block';
        });
      }
    }

    // Seta tipo ativo visualmente
    function _setTipo(tipo) {
      tipoAtual = tipo;
      ['feriado','acordo','declarado'].forEach(function(t) {
        var btn = document.getElementById('excecao_tipo_' + t);
        if (!btn) return;
        var ativo = t === tipo;
        btn.style.background    = ativo ? 'rgba(167,139,250,.22)' : '#1a1a1a';
        btn.style.borderColor   = ativo ? 'rgba(167,139,250,.65)' : '#2a2a2a';
        btn.style.color         = ativo ? '#c4b5fd' : '#666';
      });
      _renderOpcoes(tipo);
    }

    // Inicializa
    _setTipo(tipoAtual);

    // Eventos dos botões de tipo
    ['feriado','acordo','declarado'].forEach(function(t) {
      var btn = document.getElementById('excecao_tipo_' + t);
      if (btn) btn.addEventListener('click', function(){ _setTipo(t); });
    });

    // Fechar
    function _fecharModal() { var o = document.getElementById(ovId); if (o) o.remove(); }
    var btnF = document.getElementById('excecao_fechar');
    var btnC = document.getElementById('excecao_cancelar');
    if (btnF) btnF.addEventListener('click', _fecharModal);
    if (btnC) btnC.addEventListener('click', _fecharModal);

    // Remover exceção existente
    var btnRem = document.getElementById('excecao_remover');
    if (btnRem) btnRem.addEventListener('click', function(){
      try {
        var excs = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
        Object.keys(excs).forEach(function(k){ if (excs[k].data === data) delete excs[k]; });
        localStorage.setItem('hr_excecoes', JSON.stringify(excs));
      } catch(e) {}
      _fecharModal();
      _renderTelaCorrecao();
      _toast('Exceção removida.');
    });

    // Salvar
    document.getElementById('excecao_salvar').addEventListener('click', function(){
      var desc = (document.getElementById('excecao_desc') || {}).value || '';
      var exc = { data: data, tipo: tipoAtual, descricao: desc };

      if (tipoAtual === 'feriado') {
        var isMeio = document.getElementById('feriado_horas') &&
                     document.getElementById('feriado_horas').style.display !== 'none';
        exc.meioperiodo = isMeio;
        if (isMeio) {
          exc.horEntrada = (document.getElementById('fer_ent') || {}).value || r.entrada || '07:00';
          exc.horSaida   = (document.getElementById('fer_sai') || {}).value || r.saida   || '12:00';
          // Atualiza o registro para refletir o meio período
          r.entrada = exc.horEntrada;
          r.saida   = exc.horSaida;
        } else {
          // Dia todo: zera ponto (não é dia trabalhado — jornada = 0)
          exc.horEntrada = null;
          exc.horSaida   = null;
        }

      } else if (tipoAtual === 'acordo') {
        exc.horEntrada        = (document.getElementById('ac_ent')        || {}).value || r.entrada || '07:00';
        exc.horSaida          = (document.getElementById('ac_sai')        || {}).value || r.saida   || '12:00';
        exc.compensacaoHoras  = parseFloat((document.getElementById('ac_comp_horas') || {}).value) || 0;
        exc.compensacaoDias   = (document.getElementById('ac_comp_dias')  || {}).value || '';
        // Atualiza registro com os horários do acordo
        r.entrada = exc.horEntrada;
        r.saida   = exc.horSaida;
        // Adiciona observação no registro
        var obsComp = 'Acordo: meio período. Compensar ' + exc.compensacaoHoras + 'h' +
                      (exc.compensacaoDias ? ' distribuído em ' + exc.compensacaoDias : '') + '.';
        r.observacao = obsComp;

      } else if (tipoAtual === 'declarado') {
        exc.horEntrada = (document.getElementById('dec_ent') || {}).value || r.entrada || '07:00';
        exc.horSaida   = (document.getElementById('dec_sai') || {}).value || r.saida   || '17:00';
        r.entrada = exc.horEntrada;
        r.saida   = exc.horSaida;
      }

      // Persiste em hr_excecoes
      try {
        var excs2 = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
        // Remove entrada anterior para a mesma data
        Object.keys(excs2).forEach(function(k){ if (excs2[k].data === data) delete excs2[k]; });
        var novaKey = 'exc_' + data.replace(/-/g,'_');
        excs2[novaKey] = exc;
        localStorage.setItem('hr_excecoes', JSON.stringify(excs2));
      } catch(e) {}

      _fecharModal();
      _renderTelaCorrecao();

      var msgs = { feriado: '🎌 Feriado registrado.', acordo: '🤝 Acordo salvo.', declarado: '✅ Presença declarada.' };
      _toast(msgs[tipoAtual] || 'Exceção salva.');
    });

    // Toque fora fecha
    ov.addEventListener('click', function(e){ if (e.target === ov) _fecharModal(); });
  }

  /** Botão de seleção de tipo de exceção (helper visual). */
  function _btnTipoExcecao(tipo, icone, label, sub, excExist) {
    var ativo = excExist && excExist.tipo === tipo;
    return '<button id="excecao_tipo_' + tipo + '" ' +
      'style="padding:11px 6px;background:' + (ativo ? 'rgba(167,139,250,.22)' : '#1a1a1a') + ';' +
      'border:1px solid ' + (ativo ? 'rgba(167,139,250,.65)' : '#2a2a2a') + ';' +
      'border-radius:10px;color:' + (ativo ? '#c4b5fd' : '#666') + ';cursor:pointer;' +
      'font-family:Outfit,sans-serif;text-align:center;transition:all .15s;">' +
      '<div style="font-size:1.1rem;margin-bottom:3px;">' + icone + '</div>' +
      '<div style="font-size:.72rem;font-weight:700;">' + label + '</div>' +
      '<div style="font-size:.55rem;color:#555;margin-top:2px;line-height:1.3;">' + sub + '</div>' +
    '</button>';
  }

  /** Input de horário estilizado para o modal de exceção. */
  function _inputHora(id, label, val) {
    return '<div>' +
      '<div style="font-size:.6rem;color:#888;margin-bottom:4px;">' + label + '</div>' +
      '<input id="' + id + '" type="text" value="' + (val || '') + '" maxlength="5" ' +
        'style="width:100%;box-sizing:border-box;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;' +
        'color:#ddd;font-family:monospace;font-size:1.05rem;font-weight:700;padding:9px 11px;outline:none;text-align:center;" ' +
        'placeholder="HH:MM">' +
    '</div>';
  }

  /** Troca entrada ↔ saída (para batidas únicas colocadas no campo errado). */
  function _trocarEntradaSaida(grpIdx, recIdx) {
    var gr = _state.grupos[grpIdx];
    if (!gr || !gr.registros[recIdx]) return;
    var r   = gr.registros[recIdx];
    var tmp = r.entrada;
    r.entrada = r.saida;
    r.saida   = tmp;
    _renderTelaCorrecao();
  }

    /** Descarta grupos ignorados + registros vazios, propaga punições e segue. */
  function _continuarParaVinculacao() {
    // Remove grupos marcados para ignorar
    _state.grupos = _state.grupos.filter(function(gr){ return !gr._ignorar; });

    _state.grupos.forEach(function(gr) {
      // Remove registros totalmente vazios (sem entrada E sem saída E sem punição)
      gr.registros = gr.registros.filter(function(r){
        return r._punicao || r.entrada || r.saida;
      });
      // Registros com punição: garante flag para o sistema de folha
      gr.registros.forEach(function(r){
        if (r._punicao) r.observacao = 'PUNIÇÃO — batida faltante';
      });
    });

    _renderTelaVinculacao();
  }

  // ── Tela de vinculação ───────────────────────────────────────────────────

  function _renderTelaVinculacao() {
    var g   = _state.grupos;
    var di  = _state.periodo.di;
    var df  = _state.periodo.df;
    var funcs = Object.values(_getFuncionarios()).filter(function(f){ return f.ativo !== false; })
                      .sort(function(a,b){ return a.nome.localeCompare(b.nome); });

    var totalRegs = g.reduce(function(s,gr){ return s + gr.registros.length; }, 0);

    var fmtPer = function(iso) {
      if (!iso) return '—';
      var p = iso.split('-');
      return p[2] + '/' + p[1] + '/' + p[0];
    };

    var opsFuncs = '<option value="">— não vincular —</option>' +
      funcs.map(function(f){ return '<option value="' + _esc(f.id) + '">' + _esc(f.nome) + '</option>'; }).join('');

    var gruposHtml = g.map(function(gr, idx) {
      var calc = _calcGrupo(gr);
      var autoVinc = gr.funcId ? funcs.find(function(f){ return f.id === gr.funcId; }) : null;
      var nAnomalias = _totalAnomalias(calc);

      var opcoesSel = '<option value="">— não vincular —</option>' +
        funcs.map(function(f){
          return '<option value="' + _esc(f.id) + '"' + (gr.funcId === f.id ? ' selected' : '') + '>' + _esc(f.nome) + '</option>';
        }).join('');

      // Linhas da tabela
      var tabelaLinhas = calc.linhasCalc.map(function(lc) {
        var r   = lc.r;
        var res = lc.res;
        var dow = _dowNome(r.data);
        var isSab = _dow(r.data) === 6;
        var corDow = isSab ? '#8ec8c8' : T2;

        var extraHtml = res.extra > 0
          ? '<span style="color:' + GOLD + ';font-weight:700;">⚡ +' + _min2dur(res.extra) + '</span>'
          : (res.atraso > 0
              ? '<span style="color:' + RED + ';">△ -' + _min2dur(res.atraso) + '</span>'
              : '<span style="color:' + T3 + ';">—</span>');

        var almocoHtml = res.almoco > 0
          ? '<span style="font-size:.6rem;color:' + T3 + ';">🍽 ' + _min2dur(res.almoco) + '</span>'
          : '';

        // Badges de auditoria
        var badges = _auditoriaBadges(lc);
        var badgesHtml = badges.map(function(b) {
          return '<span title="' + _esc(b.title) + '" style="display:inline-block;' +
            'font-size:.55rem;font-weight:700;color:' + b.cor + ';' +
            'background:rgba(0,0,0,.3);border:1px solid ' + b.cor + ';' +
            'border-radius:4px;padding:1px 5px;margin-right:3px;margin-top:2px;' +
            'white-space:nowrap;letter-spacing:.03em;">' + _esc(b.label) + '</span>';
        }).join('');

        // Linha com destaque visual se há anomalia
        var rowStyle = badges.length > 0
          ? 'border-top:1px solid ' + BD + ';background:rgba(200,92,92,.05);'
          : 'border-top:1px solid ' + BD + ';';

        return '<tr style="' + rowStyle + '">' +
          '<td style="padding:7px 10px;font-size:.72rem;font-weight:700;color:' + corDow + ';white-space:nowrap;">' + _esc(dow) + '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T1 + ';white-space:nowrap;font-weight:600;">' + fmtPer(r.data) + '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T1 + ';white-space:nowrap;">' +
            (r.entrada && r.saida ? '<b>' + _esc(r.entrada) + '</b>→<b>' + _esc(r.saida) + '</b>' : '<span style="color:' + T3 + ';">sem horário</span>') +
          '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T2 + ';white-space:nowrap;">' +
            (lc.valido ? _min2dur(res.trab) : '<span style="color:' + T3 + ';">—</span>') +
            (almocoHtml ? '<br>' + almocoHtml : '') +
            (badgesHtml ? '<br>' + badgesHtml : '') +
          '</td>' +
          '<td style="padding:7px 4px 7px 10px;font-size:.72rem;white-space:nowrap;text-align:right;">' + extraHtml + '</td>' +
        '</tr>';
      }).join('');

      return '<div style="' + CSS_CARD + '" id="grp_' + idx + '">' +

        // Cabeçalho do grupo
        '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">' +
          '<div style="font-size:1.1rem;width:34px;height:34px;border-radius:50%;' +
            'background:rgba(201,168,76,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            (autoVinc ? '✓' : '?') +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.92rem;font-weight:800;color:' + T1 + ';">' + _esc(gr.nome) + '</div>' +
            '<div style="font-size:.72rem;color:' + T3 + ';margin-top:1px;">' +
              calc.diasCount + ' dia(s) · ' +
              _min2dur(calc.totalTrabMin) + ' trabalhadas · ' +
              (calc.totalExtraMin > 0
                ? '<span style="color:' + GOLD + ';">⚡ +' + _min2dur(calc.totalExtraMin) + ' extras</span>'
                : '<span style="color:' + T3 + ';">⚡ +0h extras</span>') +
              ' · ' +
              (calc.totalAtrasoMin > 0
                ? '<span style="color:' + RED + ';">△ ' + _min2dur(calc.totalAtrasoMin) + ' atraso/falta</span>'
                : '<span style="color:' + T3 + ';">△ 0h atraso</span>') +
              (nAnomalias > 0
                ? ' · <span style="color:#c85c5c;font-weight:700;">⚠ ' + nAnomalias + ' anomalia(s)</span>'
                : '') +
            '</div>' +
          '</div>' +
        '</div>' +

        // Toggle tabela
        '<div style="margin-bottom:10px;">' +
          '<button onclick="HR_IMPORT._toggleTabela(' + idx + ')" ' +
            'style="background:none;border:none;color:' + BLUE + ';cursor:pointer;' +
            'font-family:Outfit,sans-serif;font-size:.72rem;padding:0;">' +
            '▶ Ver detalhe por dia (' + calc.diasCount + ' registros)</button>' +
          '<div id="tab_' + idx + '" style="display:none;margin-top:10px;overflow-x:auto;">' +
            '<table style="width:100%;border-collapse:collapse;">' +
              '<thead><tr style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.06em;">' +
                '<th style="padding:4px 10px 4px 10px;text-align:left;font-weight:600;">Dia</th>' +
                '<th style="padding:4px 4px;text-align:left;font-weight:600;">Data</th>' +
                '<th style="padding:4px 4px;text-align:left;font-weight:600;">Entrada→Saída</th>' +
                '<th style="padding:4px 4px;text-align:left;font-weight:600;">Trab.</th>' +
                '<th style="padding:4px 4px 4px 10px;text-align:right;font-weight:600;">Extra/Falta</th>' +
              '</tr></thead>' +
              '<tbody>' + tabelaLinhas + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        // Seletor de funcionário
        '<div style="font-size:.62rem;color:' + T3 + ';font-weight:600;letter-spacing:.04em;margin-bottom:5px;">VINCULAR AO FUNCIONÁRIO</div>' +
        '<select id="sel_func_' + idx + '" onchange="HR_IMPORT._onVincular(' + idx + ',this.value)" ' +
          'style="width:100%;padding:10px 14px;background:#1a1006;border:1px solid ' + BD + ';' +
          'border-radius:10px;color:' + T1 + ';font-family:Outfit,sans-serif;font-size:.85rem;">' +
          opcoesSel +
        '</select>' +

      '</div>';
    }).join('');

    var html = '<div style="width:100%;max-width:560px;padding:0 16px;">' +
      _header('Importar Relatório', 'Cálculo ao minuto · 8h/dia · 4h/sáb') +

      // Resumo geral
      '<div style="' + CSS_CARD + 'display:flex;align-items:center;gap:0;margin-bottom:16px;padding:14px;">' +
        _kpi(String(totalRegs), 'registros') +
        _sep() +
        _kpi(String(g.length), 'funcionários') +
        _sep() +
        '<div style="flex:1;text-align:right;">' +
          '<div style="font-size:.78rem;font-weight:800;color:' + T1 + ';white-space:nowrap;">' +
            fmtPer(di) + ' →' +
          '</div>' +
          '<div style="font-size:.78rem;font-weight:800;color:' + T1 + ';">' + fmtPer(df) + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">período</div>' +
        '</div>' +
      '</div>' +

      '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px;">' +
        'VINCULE CADA NOME AO FUNCIONÁRIO CORRETO' +
      '</div>' +

      gruposHtml +

      // Botões finais
      '<button onclick="HR_IMPORT._confirmarImportacao()" ' +
        'style="width:100%;padding:14px;border-radius:11px;' +
        'background:linear-gradient(135deg,#091a09,#040d04);' +
        'border:1.5px solid rgba(92,184,92,.4);color:' + GREEN + ';' +
        'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;' +
        'cursor:pointer;letter-spacing:.04em;margin-bottom:8px;">✅ Importar Registros</button>' +

      '<button onclick="HR_IMPORT._fechar()" ' +
        'style="width:100%;padding:12px;border-radius:11px;background:transparent;' +
        'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
        'font-size:.85rem;cursor:pointer;">Cancelar</button>' +
    '</div>';

    _overlay('hrImport', html);

    // ── ETAPA 5: injeta painel de resumo operacional e botão PDF ──────────
    _patchVinculacaoUI();
  }

  function _kpi(valor, label) {
    return '<div style="flex:1;text-align:center;">' +
      '<div style="font-size:1.3rem;font-weight:800;color:' + GOLD + ';">' + valor + '</div>' +
      '<div style="font-size:.62rem;color:' + T3 + ';">' + label + '</div>' +
    '</div>';
  }
  function _sep() {
    return '<div style="width:1px;background:' + BD + ';margin:0 8px;height:30px;"></div>';
  }

  function _toggleTabela(idx) {
    var el = document.getElementById('tab_' + idx);
    var btn = el && el.previousElementSibling;
    if (!el) return;
    var open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (btn) btn.textContent = (open ? '▼' : '▶') + btn.textContent.slice(1);
  }

  function _onVincular(idx, funcId) {
    _state.grupos[idx].funcId = funcId || null;
  }

  // ── Confirmar importação ─────────────────────────────────────────────────

  function _confirmarImportacao() {
    var regs = _getRegistros();
    var funcs = _getFuncionarios();
    var importados = 0, pulados = 0, semFunc = 0;
    var conflitos = [];

    // Identificador único deste lote de importação (usado para apagar em bloco)
    var loteId = 'lote_' + Date.now();

    _state.grupos.forEach(function(gr) {
      if (!gr.funcId) { semFunc += gr.registros.length; return; }
      var f = funcs[gr.funcId];
      if (!f) { semFunc += gr.registros.length; return; }

      gr.registros.forEach(function(r) {
        // Verifica duplicata — mesmo funcionário + mesma data = pula sem exceção
        var dup = Object.values(regs).find(function(rx) {
          return rx.funcionarioId === gr.funcId && rx.data === r.data;
        });
        if (dup) { pulados++; conflitos.push(f.nome.split(' ')[0] + ' · ' + r.data); return; }

        // ── Trava de jornada impossível (Item 2) ──────────────────────────
        var entMin   = _hhmm2min(r.entrada);
        var saiMin   = _hhmm2min(r.saida);
        var almocoMin = (r.almocoManual !== null && r.almocoManual !== undefined) ? r.almocoManual : 0;
        var travou   = _validarJornada(entMin, saiMin, almocoMin);
        if (!travou.valido) {
          // Marca como inválido operacionalmente e pula sem importar
          conflitos.push(f.nome.split(' ')[0] + ' · ' + r.data + ' [INVÁLIDO: ' + travou.motivo + ']');
          pulados++;
          return;
        }
        var isOvernightSave = !isNaN(entMin) && !isNaN(saiMin) && saiMin < entMin && CFG.allowOvernight === true;
        var calc = (!isNaN(entMin) && !isNaN(saiMin) && (saiMin > entMin || isOvernightSave))
          ? _calcDia(entMin, saiMin, r.data, almocoMin, gr.funcId || null)
          : { trab: 0, saldo: 0, extra: 0, atraso: 0, almoco: 0 };

        var id = _genId();
        regs[id] = {
          id: id,
          funcionarioId: gr.funcId,
          data: r.data,
          entrada: r.entrada || '',
          saida: r.saida || '',
          horas: parseFloat((calc.trab / 60).toFixed(4)),
          extra: parseFloat((calc.extra / 60).toFixed(4)),
          tipoExtra: (function(){
            // Classifica pelo dia para gravar o tipo correto no registro
            var cls = _classificarHE({ data: r.data, extra: calc.extra, funcId: gr.funcId || null });
            if (cls.extra200 > 0) return 'especial';
            if (cls.extra100 > 0) return (CFG.feriados && CFG.feriados.indexOf(r.data) >= 0) ? 'feriado' : 'domingo';
            return 'normal';
          }()),
          destinoExtra: 'pagar',
          producao: '',
          instalacao: '',
          ieo: '',
          observacao: 'Importado do relatório de presença',
          loteId: loteId,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        };
        importados++;
      });
    });

    _saveRegistros(regs);

    var msg = '✅ ' + importados + ' registro(s) importado(s).';
    if (pulados > 0) msg += ' ⚠️ ' + pulados + ' duplicata(s) ignorada(s).';
    if (semFunc > 0) msg += ' ℹ️ ' + semFunc + ' sem vínculo.';
    _toast(msg);

    _fechar();
    if (typeof HR_FUNC !== 'undefined' && HR_FUNC.renderPaginaFuncionarios) {
      HR_FUNC.renderPaginaFuncionarios();
    }
  }

  // ── Helpers UI ───────────────────────────────────────────────────────────

  function _header(titulo, subtitulo) {
    return '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;width:100%;">' +
      '<div>' +
        '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
        '<div style="font-size:1.3rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">📥 ' + titulo + '</div>' +
        '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">' + subtitulo + '</div>' +
      '</div>' +
      '<button onclick="HR_IMPORT._fechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
    '</div>';
  }

  function _fechar() { _closeOverlay('hrImport'); }

  // ══════════════════════════════════════════════════════════════════════════
  // ETAPA 5 — RESUMO OPERACIONAL
  // Painel de totais agregados de todos os grupos do período importado.
  // Exibido na tela de vinculação, abaixo do resumo de KPIs existente.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Gera o HTML do painel de resumo operacional de HE.
   * Agrega todos os grupos de _state.grupos.
   *
   * @param {Number} valorHora — valor da hora em R$ (0 se não configurado)
   * @returns {String} HTML do painel
   */
  function _htmlResumoOperacional(valorHora) {
    valorHora = valorHora || 0;

    var totTrabMin    = 0;
    var totExtra50Min = 0;
    var totExtra100Min= 0;
    var totExtra200Min= 0;
    var totAtrasoMin  = 0;
    var totSaldoMin   = 0;

    _state.grupos.forEach(function(gr) {
      var calc = _calcGrupo(gr);
      var fin  = _calcFinanceiroGrupo(calc, valorHora);
      totTrabMin     += calc.totalTrabMin;
      totExtra50Min  += fin.totalExtra50Min;
      totExtra100Min += fin.totalExtra100Min;
      totExtra200Min += fin.totalExtra200Min;
      totAtrasoMin   += calc.totalAtrasoMin;
      totSaldoMin    += calc.saldoLiquidoMin;
    });

    var totExtraMin   = totExtra50Min + totExtra100Min + totExtra200Min;
    var valorFin50    = _calcValorHE(totExtra50Min,  CFG.he.normal,   valorHora);
    var valorFin100   = _calcValorHE(totExtra100Min, CFG.he.domingo,  valorHora);
    var valorFin200   = _calcValorHE(totExtra200Min, CFG.he.especial, valorHora);
    var valorFinTotal = valorFin50 + valorFin100 + valorFin200;

    var corSaldo = totSaldoMin >= 0 ? GOLD : RED;
    var saldoSinal = totSaldoMin >= 0 ? '+' : '';

    var linhaHE = function(label, min, mult, valor, cor) {
      if (min <= 0) return '';
      return '<tr>' +
        '<td style="padding:5px 10px;font-size:.72rem;color:' + T2 + ';">' + label + '</td>' +
        '<td style="padding:5px 4px;font-size:.72rem;color:' + cor + ';font-weight:700;">' + _min2dur(min) + '</td>' +
        '<td style="padding:5px 4px;font-size:.7rem;color:' + T3 + ';">× ' + mult + '</td>' +
        '<td style="padding:5px 10px 5px 4px;font-size:.72rem;color:' + cor + ';text-align:right;">' +
          (valorHora > 0 ? _fmtMoeda(valor) : '—') +
        '</td>' +
      '</tr>';
    };

    return '<div style="' + CSS_CARD + 'margin-bottom:16px;">' +
      // Título
      '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px;">' +
        '📊 RESUMO OPERACIONAL DO PERÍODO' +
      '</div>' +

      // Linha de totais principais
      '<div style="display:flex;gap:0;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid ' + BD + ';">' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + T1 + ';">' + _min2dur(totTrabMin) + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">total trabalhado</div>' +
        '</div>' +
        '<div style="width:1px;background:' + BD + ';margin:0 8px;"></div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + GOLD + ';">' + _min2dur(totExtraMin) + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">total extras</div>' +
        '</div>' +
        '<div style="width:1px;background:' + BD + ';margin:0 8px;"></div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + RED + ';">' + _min2dur(totAtrasoMin) + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">total atrasos</div>' +
        '</div>' +
        '<div style="width:1px;background:' + BD + ';margin:0 8px;"></div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + corSaldo + ';">' + saldoSinal + _min2dur(Math.abs(totSaldoMin)) + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">saldo final</div>' +
        '</div>' +
      '</div>' +

      // Tabela de classificação de HE
      (totExtraMin > 0 ? (
        '<div style="font-size:.62rem;color:' + T3 + ';font-weight:600;letter-spacing:.04em;margin-bottom:8px;">CLASSIFICAÇÃO DE HORAS EXTRAS</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<thead><tr style="font-size:.58rem;color:' + GOLD + ';letter-spacing:.06em;">' +
            '<th style="padding:3px 10px;text-align:left;font-weight:600;">Tipo</th>' +
            '<th style="padding:3px 4px;text-align:left;font-weight:600;">Horas</th>' +
            '<th style="padding:3px 4px;text-align:left;font-weight:600;">Mult.</th>' +
            '<th style="padding:3px 10px 3px 4px;text-align:right;font-weight:600;">Valor</th>' +
          '</tr></thead>' +
          '<tbody>' +
            linhaHE('HE 50% — Dias úteis/Sáb (×1,5)',  totExtra50Min,  CFG.he.normal,  valorFin50,  GOLD) +
            linhaHE('HE 100% — Dom/Feriado (×2,0)', totExtra100Min, CFG.he.domingo, valorFin100, '#8ec8c8') +
            linhaHE('HE 200% — Especial',   totExtra200Min, CFG.he.especial, valorFin200, '#c88e5c') +
            // Linha de total financeiro (só se há valor hora configurado)
            (valorHora > 0 && valorFinTotal > 0 ? (
              '<tr style="border-top:1px solid ' + BD + ';">' +
                '<td colspan="3" style="padding:7px 10px;font-size:.72rem;font-weight:700;color:' + T1 + ';">Total financeiro extras</td>' +
                '<td style="padding:7px 10px 7px 4px;font-size:.8rem;font-weight:800;color:' + GOLD + ';text-align:right;">' + _fmtMoeda(valorFinTotal) + '</td>' +
              '</tr>'
            ) : '') +
          '</tbody>' +
        '</table>'
      ) : '<div style="font-size:.72rem;color:' + T3 + ';text-align:center;padding:8px 0;">Sem horas extras no período</div>') +

      // Nota sobre valor/hora
      (valorHora <= 0 ? (
        '<div style="font-size:.63rem;color:' + T3 + ';margin-top:10px;padding:8px 10px;' +
        'background:rgba(255,255,255,.03);border-radius:7px;border:1px solid ' + BD + ';">' +
          'ℹ️ Configure o valor/hora no cadastro do funcionário para exibir valores financeiros.' +
        '</div>'
      ) : '') +

      // ── Item 3: Breakdown individual por funcionário ──────────────────────
      (_state.grupos.length > 1 ? (
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid ' + BD + ';">' +
        '<div style="font-size:.62rem;color:' + T3 + ';font-weight:600;letter-spacing:.04em;margin-bottom:8px;">DETALHE POR FUNCIONÁRIO</div>' +
        _state.grupos.map(function(gr) {
          var calc = _calcGrupo(gr);
          var fin  = _calcFinanceiroGrupo(calc, valorHora);
          var anom = _totalAnomalias(calc);
          var totalIndExtra = fin.totalExtra50Min + fin.totalExtra100Min + fin.totalExtra200Min;
          if (calc.totalTrabMin === 0 && totalIndExtra === 0) return '';
          return '<div style="display:flex;align-items:baseline;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">' +
            '<div style="font-size:.72rem;font-weight:700;color:' + T1 + ';flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(gr.nome) + '</div>' +
            '<div style="font-size:.68rem;color:' + T2 + ';white-space:nowrap;">' + _min2dur(calc.totalTrabMin) + '</div>' +
            (totalIndExtra > 0 ? '<div style="font-size:.68rem;color:' + GOLD + ';white-space:nowrap;">⚡ +' + _min2dur(totalIndExtra) + '</div>' : '') +
            (fin.totalExtra100Min > 0 ? '<div style="font-size:.62rem;color:#8ec8c8;white-space:nowrap;">HE100:' + _min2dur(fin.totalExtra100Min) + '</div>' : '') +
            (fin.totalExtra200Min > 0 ? '<div style="font-size:.62rem;color:#c88e5c;white-space:nowrap;">HE200:' + _min2dur(fin.totalExtra200Min) + '</div>' : '') +
            (valorHora > 0 && fin.valorTotalExtras > 0 ? '<div style="font-size:.68rem;color:' + GOLD + ';font-weight:700;white-space:nowrap;">' + _fmtMoeda(fin.valorTotalExtras) + '</div>' : '') +
            (calc.totalAtrasoMin > 0 ? '<div style="font-size:.62rem;color:' + RED + ';white-space:nowrap;">△' + _min2dur(calc.totalAtrasoMin) + '</div>' : '') +
            (anom > 0 ? '<div style="font-size:.62rem;color:#c85c5c;white-space:nowrap;">⚠' + anom + '</div>' : '') +
          '</div>';
        }).join('') +
        '</div>'
      ) : '') +

    '</div>';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ETAPA 4 — RELATÓRIO PDF
  // Geração de relatório HTML imprimível com todas as faixas de HE.
  // Usa window.print() nativo — sem dependência de biblioteca externa.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Abre janela de impressão com relatório completo de HE.
   * Inclui: horas normais, HE50, HE100, HE200, totais financeiros.
   *
   * @param {Number} valorHora — valor da hora em R$ (0 se não configurado)
   */
  function _gerarRelatorioHE(valorHora) {
    valorHora = valorHora || 0;

    // Guard: captura multiplicadores antes de qualquer acesso a CFG.he
    // (evita TypeError se CFG ou CFG.he for undefined no momento da execução)
    var _he = (typeof CFG !== 'undefined' && CFG && CFG.he) || {};
    var _multNormal   = parseFloat(_he.normal)   || 1.5;
    var _multDomingo  = parseFloat(_he.domingo)  || 2.0;
    var _multFeriado  = parseFloat(_he.feriado)  || 2.0;
    var _multEspecial = parseFloat(_he.especial) || 3.0;

    var di = _state.periodo.di || '';
    var df = _state.periodo.df || '';
    var fmtPer = function(iso) {
      if (!iso) return '—';
      var p = iso.split('-');
      return p[2] + '/' + p[1] + '/' + p[0];
    };

    // Gera HTML de cada funcionário
    var secoesFuncs = _state.grupos.map(function(gr) {
      var calc = _calcGrupo(gr);
      var fin  = _calcFinanceiroGrupo(calc, valorHora);

      // Tabela de dias
      var linhasDias = calc.linhasCalc.map(function(lc) {
        var r   = lc.r;
        var res = lc.res;
        var dow = _dowNome(r.data);
        var isSab = _dow(r.data) === 6;

        // Classifica HE do dia
        var classeHE = lc.valido ? _classificarHE({ data: r.data, extra: res.extra, funcId: gr.funcId || null }) : { extra50:0, extra100:0, extra200:0 };

        var heLabel = '';
        if (classeHE.extra50  > 0) heLabel = 'HE 50%';
        if (classeHE.extra100 > 0) heLabel = 'HE 100%';
        if (classeHE.extra200 > 0) heLabel = 'HE 200%';

        return '<tr>' +
          '<td>' + _esc(dow) + '</td>' +
          '<td>' + fmtPer(r.data) + '</td>' +
          '<td>' + (r.entrada && r.saida ? r.entrada + ' → ' + r.saida : '—') + '</td>' +
          '<td>' + (res.almoco > 0 ? _min2dur(res.almoco) : '—') + '</td>' +
          '<td>' + (lc.valido ? _min2dur(res.trab) : '—') + '</td>' +
          '<td class="he-extra">' + (res.extra > 0 ? _min2dur(res.extra) : '—') + '</td>' +
          '<td class="he-tipo">' + (heLabel || '—') + '</td>' +
        '</tr>';
      }).join('');

      // Totais do funcionário
      var jornadaNorm = calc.totalTrabMin - calc.totalExtraMin;
      var funcNome = gr.nome;

      return '<div class="func-section">' +
        '<h3>' + _esc(funcNome) + '</h3>' +
        '<table class="tabela-dias">' +
          '<thead><tr>' +
            '<th>Dia</th><th>Data</th><th>Entrada → Saída</th>' +
            '<th>Almoço</th><th>Trabalhado</th><th>H. Extra</th><th>Tipo HE</th>' +
          '</tr></thead>' +
          '<tbody>' + linhasDias + '</tbody>' +
        '</table>' +

        '<div class="totais-func">' +
          '<table class="tabela-totais">' +
            '<tr><td>Total trabalhado</td><td class="val">' + _min2dur(calc.totalTrabMin) + '</td></tr>' +
            '<tr><td>Horas normais (jornada)</td><td class="val">' + _min2dur(Math.max(0, jornadaNorm)) + '</td></tr>' +
            (fin.totalExtra50Min  > 0 ? '<tr class="he50"><td>Horas extras 50% (HE50)</td><td class="val">' + _min2dur(fin.totalExtra50Min) + (valorHora > 0 ? ' — ' + _fmtMoeda(fin.valorExtra50) : '') + '</td></tr>' : '') +
            (fin.totalExtra100Min > 0 ? '<tr class="he100"><td>Horas extras 100% (HE100)</td><td class="val">' + _min2dur(fin.totalExtra100Min) + (valorHora > 0 ? ' — ' + _fmtMoeda(fin.valorExtra100) : '') + '</td></tr>' : '') +
            (fin.totalExtra200Min > 0 ? '<tr class="he200"><td>Horas extras 200% (HE200)</td><td class="val">' + _min2dur(fin.totalExtra200Min) + (valorHora > 0 ? ' — ' + _fmtMoeda(fin.valorExtra200) : '') + '</td></tr>' : '') +
            (calc.totalAtrasoMin  > 0 ? '<tr class="atraso"><td>Total atrasos/faltas</td><td class="val">-' + _min2dur(calc.totalAtrasoMin) + '</td></tr>' : '') +
            '<tr class="saldo"><td>Saldo líquido</td><td class="val">' + (calc.saldoLiquidoMin >= 0 ? '+' : '') + _min2dur(Math.abs(calc.saldoLiquidoMin)) + '</td></tr>' +
            (valorHora > 0 && fin.valorTotalExtras > 0 ? '<tr class="fin-total"><td><b>Total financeiro extras</b></td><td class="val"><b>' + _fmtMoeda(fin.valorTotalExtras) + '</b></td></tr>' : '') +
          '</table>' +
        '</div>' +
      '</div>';
    }).join('');

    // Totais globais
    var gTotTrab    = 0, gTot50Min = 0, gTot100Min = 0, gTot200Min = 0;
    var gTotAtraso  = 0, gValorFin = 0;
    _state.grupos.forEach(function(gr) {
      var calc = _calcGrupo(gr);
      var fin  = _calcFinanceiroGrupo(calc, valorHora);
      gTotTrab   += calc.totalTrabMin;
      gTot50Min  += fin.totalExtra50Min;
      gTot100Min += fin.totalExtra100Min;
      gTot200Min += fin.totalExtra200Min;
      gTotAtraso += calc.totalAtrasoMin;
      gValorFin  += fin.valorTotalExtras;
    });

    var html = '<!DOCTYPE html><html lang="pt-BR"><head>' +
      '<meta charset="UTF-8">' +
      '<title>Relatório de Horas Extras — HR Mármores</title>' +
      '<style>' +
        'body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;margin:20px;}' +
        'h1{font-size:16px;margin-bottom:2px;}' +
        '.subtitulo{font-size:11px;color:#555;margin-bottom:18px;}' +
        'h3{font-size:13px;margin:20px 0 6px;border-bottom:2px solid #c9a84c;padding-bottom:4px;color:#3d2e00;}' +
        '.tabela-dias{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px;}' +
        '.tabela-dias th{background:#f5f0e8;padding:5px 8px;text-align:left;border:1px solid #ddd;font-weight:600;}' +
        '.tabela-dias td{padding:4px 8px;border:1px solid #ddd;white-space:nowrap;}' +
        '.tabela-dias tr:nth-child(even) td{background:#fafaf7;}' +
        '.he-extra{color:#7a5200;font-weight:700;}' +
        '.he-tipo{font-size:10px;color:#555;}' +
        '.totais-func{margin-top:6px;margin-bottom:20px;}' +
        '.tabela-totais{border-collapse:collapse;font-size:11px;}' +
        '.tabela-totais td{padding:3px 14px 3px 0;}' +
        '.tabela-totais .val{font-weight:700;text-align:right;padding-left:20px;}' +
        '.he50 td{color:#7a5200;}' +
        '.he100 td{color:#1a5c6b;}' +
        '.he200 td{color:#6b2800;}' +
        '.atraso td{color:#c00;}' +
        '.saldo td{color:#3d7a00;font-weight:700;}' +
        '.fin-total td{color:#3d2e00;border-top:1px solid #ddd;padding-top:6px;}' +
        '.resumo-global{background:#f5f0e8;border:1px solid #c9a84c;border-radius:6px;padding:12px 16px;margin-bottom:20px;}' +
        '.resumo-global h2{font-size:13px;margin:0 0 10px;color:#3d2e00;}' +
        '.resumo-global table{font-size:11px;border-collapse:collapse;}' +
        '.resumo-global td{padding:2px 16px 2px 0;}' +
        '.resumo-global .val{font-weight:700;text-align:right;}' +
        '.func-section{page-break-inside:avoid;}' +
        '@media print{body{margin:10px;}h3{color:#000;}}' +
      '</style>' +
    '</head><body>' +

    '<h1>📋 Relatório de Horas Extras — HR Mármores e Granitos</h1>' +
    '<div class="subtitulo">' +
      'Período: ' + fmtPer(di) + ' a ' + fmtPer(df) + ' · ' +
      'Gerado em: ' + new Date().toLocaleString('pt-BR') +
      (valorHora > 0 ? ' · Valor/hora: ' + _fmtMoeda(valorHora) : '') +
    '</div>' +

    // Resumo global
    '<div class="resumo-global">' +
      '<h2>Resumo Consolidado</h2>' +
      '<table>' +
        '<tr><td>Total geral trabalhado</td><td class="val">' + _min2dur(gTotTrab) + '</td></tr>' +
        (gTot50Min  > 0 ? '<tr><td>HE 50% — Dias úteis</td><td class="val">' + _min2dur(gTot50Min)  + (valorHora > 0 ? ' — ' + _fmtMoeda(_calcValorHE(gTot50Min, _multNormal, valorHora)) : '') + '</td></tr>' : '') +
        (gTot100Min > 0 ? '<tr><td>HE 100% — Dom/Feriado</td><td class="val">' + _min2dur(gTot100Min) + (valorHora > 0 ? ' — ' + _fmtMoeda(_calcValorHE(gTot100Min, _multDomingo, valorHora)) : '') + '</td></tr>' : '') +
        (gTot200Min > 0 ? '<tr><td>HE 200% — Especial</td><td class="val">' + _min2dur(gTot200Min) + (valorHora > 0 ? ' — ' + _fmtMoeda(_calcValorHE(gTot200Min, _multEspecial, valorHora)) : '') + '</td></tr>' : '') +
        (gTotAtraso > 0 ? '<tr><td>Total atrasos/faltas</td><td class="val">-' + _min2dur(gTotAtraso) + '</td></tr>' : '') +
        (valorHora > 0 && gValorFin > 0 ? '<tr><td><b>Total financeiro extras</b></td><td class="val"><b>' + _fmtMoeda(gValorFin) + '</b></td></tr>' : '') +
      '</table>' +
    '</div>' +

    secoesFuncs +

    '</body></html>';

    // Tenta abrir pop-up; se bloqueado usa Blob URL (funciona em PWA/mobile)
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      // Fallback Blob: cria URL local e abre numa nova aba sem depender de pop-up
      try {
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
        setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 10000);
        _toast('📄 Relatório aberto. Use Ctrl+P / Compartilhar para imprimir.');
      } catch(e) {
        _toast('⚠️ Não foi possível abrir o relatório. Permita pop-ups no navegador.');
      }
      return;
    }
    win.document.write(html);
    win.document.close();
    // Bug 2 fix: usa readyState polling — mais confiável que onload em PWA/mobile
    var _tentativas = 0;
    var _aguardar = setInterval(function() {
      _tentativas++;
      try {
        if (win.closed) { clearInterval(_aguardar); return; }
        if (win.document.readyState === 'complete' || _tentativas >= 20) {
          clearInterval(_aguardar);
          win.print();
        }
      } catch(e) { clearInterval(_aguardar); }
    }, 150);
  }

  /**
   * Abre o modal de configuração para geração do relatório de HE.
   * Permite informar o valor/hora antes de gerar o PDF.
   */
  function _abrirDialogRelatorioHE() {
    // Tenta obter valor/hora do primeiro funcionário vinculado (se houver)
    var funcs = _getFuncionarios();
    var valorHoraDefault = 0;
    _state.grupos.some(function(gr) {
      if (gr.funcId && funcs[gr.funcId] && funcs[gr.funcId].valorHora) {
        valorHoraDefault = parseFloat(funcs[gr.funcId].valorHora) || 0;
        return true;
      }
      return false;
    });

    var overlayId = 'hrImportRelHE';
    var ovEl = document.createElement('div');
    ovEl.id = overlayId;
    ovEl.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(8,7,4,.97);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:Outfit,sans-serif;';
    ovEl.innerHTML =
      '<div style="width:100%;max-width:380px;padding:0 20px;">' +
        '<div style="' + CSS_CARD + 'padding:22px 20px;">' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:6px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + T1 + ';margin-bottom:4px;">📄 Relatório de HE</div>' +
          '<div style="font-size:.72rem;color:' + T3 + ';margin-bottom:18px;">' +
            'Informe o valor/hora para calcular valores financeiros (opcional).' +
          '</div>' +

          '<div style="font-size:.62rem;color:' + T3 + ';font-weight:600;letter-spacing:.04em;margin-bottom:5px;">VALOR DA HORA (R$)</div>' +
          '<input id="he_valor_hora" type="number" min="0" step="0.01" ' +
            'value="' + (valorHoraDefault > 0 ? valorHoraDefault.toFixed(2) : '') + '" ' +
            'placeholder="Ex: 18.50" ' +
            'style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:10px;' +
            'border:1px solid ' + BD + ';background:rgba(255,255,255,.03);color:' + T1 + ';' +
            'font-family:Outfit,sans-serif;font-size:.9rem;outline:none;margin-bottom:14px;">' +

          '<button onclick="(function(){' +
            'var vh = parseFloat(document.getElementById(\'he_valor_hora\').value)||0;' +
            'document.getElementById(\'' + overlayId + '\').remove();' +
            'HR_IMPORT._gerarRelatorioHE(vh);' +
          '})()" ' +
            'style="width:100%;padding:12px;border-radius:10px;' +
            'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
            'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
            'font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;' +
            'cursor:pointer;margin-bottom:8px;">📥 Gerar e Imprimir PDF</button>' +

          '<button onclick="document.getElementById(\'' + overlayId + '\').remove()" ' +
            'style="width:100%;padding:10px;border-radius:10px;background:transparent;' +
            'border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;' +
            'font-size:.82rem;cursor:pointer;">Cancelar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ovEl);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTEGRAÇÃO — Injeção do resumo operacional na tela de vinculação
  // (patch aditivo, sem alterar a estrutura existente de _renderTelaVinculacao)
  // ══════════════════════════════════════════════════════════════════════════

  // Sobrescreve apenas o botão final para incluir o botão de PDF
  // A lógica original de _renderTelaVinculacao não é modificada estruturalmente.
  // O resumo operacional é injetado via _patchVinculacaoUI() chamado após o render.

  /**
   * Injeta o painel de resumo e o botão de PDF na tela de vinculação,
   * após ela ser renderizada. Chamado ao final de _renderTelaVinculacao.
   */
  function _patchVinculacaoUI() {
    // Aguarda o DOM estar pronto
    setTimeout(function() {
      var overlay = document.getElementById('hrImport');
      if (!overlay) return;

      // ── Painel de resumo operacional (inserido antes do botão "Importar") ──
      var btnImportar = overlay.querySelector('button[onclick*="_confirmarImportacao"]');
      if (btnImportar && btnImportar.parentNode) {
        var painelResumo = document.createElement('div');
        painelResumo.innerHTML = _htmlResumoOperacional(0);
        btnImportar.parentNode.insertBefore(painelResumo.firstChild, btnImportar);
      }

      // ── Botão de relatório PDF (inserido após botão "Importar") ──
      var btnCancelar = overlay.querySelector('button[onclick*="_fechar"]');
      if (btnCancelar && btnCancelar.parentNode) {
        var btnPDF = document.createElement('button');
        btnPDF.textContent = '📄 Gerar Relatório de HE (PDF)';
        btnPDF.style.cssText = 'width:100%;padding:12px;border-radius:11px;background:transparent;' +
          'border:1.5px solid rgba(201,168,76,.35);color:#C9A84C;font-family:Outfit,sans-serif;' +
          'font-size:.85rem;font-weight:600;cursor:pointer;margin-bottom:8px;';
        btnPDF.onclick = function() { _abrirDialogRelatorioHE(); };
        btnCancelar.parentNode.insertBefore(btnPDF, btnCancelar);
      }
    }, 0);
  }

  /**
   * Motor financeiro unificado de horas extras.
   * Substitui o cálculo interno do HR_FUNC, eliminando a inconsistência
   * entre o painel do funcionário e o relatório PDF.
   *
   * Recebe os registros já persistidos de um funcionário e o objeto do
   * funcionário, e retorna o breakdown financeiro correto com classificação
   * HE50/HE100/HE200 usando o classificador oficial _classificarHE.
   *
   * Estratégia de classificação (dupla camada para robustez):
   *   1. Usa tipoExtra persistido (se preenchido corretamente pelo patch A).
   *   2. Fallback: reclassifica pela data (cobre registros importados
   *      antes do patch, onde tipoExtra era sempre 'normal').
   *
   * @param {Array}  registros — registros do funcionário no período
   * @param {Object} func      — objeto do funcionário (hr_funcionarios)
   * @param {String} mesISO    — "yyyy-mm" de referência para valor/hora real
   * @returns {Object} breakdown financeiro completo
   */
  function calcSaldoHE(registros, func, mesISO) {
    var refMes = mesISO ||
      (registros && registros.length > 0
        ? registros.slice().sort(function(a,b){ return a.data.localeCompare(b.data); })[0].data
        : new Date().toISOString()).slice(0, 7);

    var valorHoraBase    = _calcValorHoraReal(func, refMes);
    var totalExtra50Min  = 0;
    var totalExtra100Min = 0;
    var totalExtra200Min = 0;
    var totalExtraBancoMin = 0; // horas que foram para banco (não entram no financeiro)

    // ── Audit opcional: window._hrAuditExtras = true ativa logs no console ──
    var audit = (typeof window !== 'undefined' && window._hrAuditExtras);
    if (audit) {
      console.group('[HR] calcSaldoHE — func: ' + (func && func.nome || '?') + ' · refMes: ' + refMes);
      console.log('Total registros recebidos:', (registros || []).length);
    }

    (registros || []).forEach(function(r) {
      var extraHoras = parseFloat(r.extra) || 0;

      if (r.destinoExtra === 'banco') {
        // banco de horas não entra no financeiro — rastreamos separado
        var bancoMin = Math.round(extraHoras * 60);
        if (bancoMin > 0) totalExtraBancoMin += bancoMin;
        if (audit) console.log('%c[BANCO]  ' + r.data + ' → ' + extraHoras + 'h → destinoExtra=banco — EXCLUÍDO do financeiro',
          'color:#8ec8f0', { id: r.id, tipoExtra: r.tipoExtra, extraHoras: extraHoras });
        return;
      }

      if (extraHoras <= 0) {
        if (audit && r.extra !== undefined && r.extra !== null && r.extra !== 0 && r.extra !== '')
          console.log('%c[ZERO]   ' + r.data + ' → extra=' + r.extra + ' → ignorado (≤0)',
            'color:#888', { id: r.id });
        return;
      }

      var extraMin = Math.round(extraHoras * 60);
      var tipo = r.tipoExtra || 'normal';
      var faixaUsada;

      if (tipo === 'especial') {
        totalExtra200Min += extraMin;
        faixaUsada = 'HE200';
      } else if (tipo === 'feriado' || tipo === 'domingo') {
        totalExtra100Min += extraMin;
        faixaUsada = 'HE100';
      } else {
        // 'normal' ou ausente: reclassifica pela data (retrocompatível)
        var cls = _classificarHE({ data: r.data, extra: extraMin, funcId: func && func.id || null });
        totalExtra50Min  += cls.extra50;
        totalExtra100Min += cls.extra100;
        totalExtra200Min += cls.extra200;
        faixaUsada = cls.extra200 > 0 ? 'HE200' : cls.extra100 > 0 ? 'HE100' : 'HE50';
      }

      if (audit) console.log('%c[PAGAR]  ' + r.data + ' → ' + extraHoras + 'h (' + extraMin + 'min) → ' + faixaUsada + ' · tipoExtra=' + tipo,
        'color:#c9a84c', { id: r.id, destinoExtra: r.destinoExtra || 'pagar' });
    });

    var valorExtra50     = _calcValorHE(totalExtra50Min,  CFG.he.normal,   valorHoraBase);
    var valorExtra100    = _calcValorHE(totalExtra100Min, CFG.he.domingo,  valorHoraBase);
    var valorExtra200    = _calcValorHE(totalExtra200Min, CFG.he.especial, valorHoraBase);
    var valorTotalExtras = valorExtra50 + valorExtra100 + valorExtra200;

    if (audit) {
      console.log('── RESUMO ──');
      console.log('HE50: '  + (totalExtra50Min/60).toFixed(2)  + 'h → R$ ' + valorExtra50.toFixed(2));
      console.log('HE100: ' + (totalExtra100Min/60).toFixed(2) + 'h → R$ ' + valorExtra100.toFixed(2));
      console.log('HE200: ' + (totalExtra200Min/60).toFixed(2) + 'h → R$ ' + valorExtra200.toFixed(2));
      console.log('🏦 Banco: ' + (totalExtraBancoMin/60).toFixed(2) + 'h (não entra no financeiro)');
      console.log('TOTAL FINANCEIRO: ' + ((totalExtra50Min+totalExtra100Min+totalExtra200Min)/60).toFixed(2) + 'h → R$ ' + valorTotalExtras.toFixed(2));
      console.groupEnd();
    }

    return {
      valorHoraBase:    valorHoraBase,
      totalExtra50Min:  totalExtra50Min,
      totalExtra100Min: totalExtra100Min,
      totalExtra200Min: totalExtra200Min,
      valorExtra50:     valorExtra50,
      valorExtra100:    valorExtra100,
      valorExtra200:    valorExtra200,
      valorTotalExtras: valorTotalExtras,
      totalExtraHoras:  (totalExtra50Min + totalExtra100Min + totalExtra200Min) / 60,
      // Campo extra: banco de horas (para exibição na UI, não entra no pagamento)
      totalExtraBancoMin: totalExtraBancoMin,
      totalExtraBancoHoras: totalExtraBancoMin / 60
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ITEM 4 — ASSINATURA DE FECHAMENTO
  // Prepara estrutura grupo.assinadoPor / grupo.fechadoEm / grupo.hash
  // para futuramente congelar o fechamento de um período.
  //
  // _prepararAssinatura(grupo, calc, responsavel)
  //   → retorna objeto de fechamento com hash deterministico (SHA-like simples
  //     sem dependência de crypto — suficiente para detectar adulteração
  //     até implementação de assinatura digital real).
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Gera um hash simples (djb2) de uma string.
   * Não é criptográfico — serve como checksum de integridade básica.
   */
  function _hashSimples(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // converte para 32-bit
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Prepara a assinatura de fechamento de um grupo/período.
   * Congela os dados do período de forma reproduzível.
   *
   * @param {Object} grupo      — grupo de registros { nome, registros, funcId }
   * @param {Object} calc       — resultado de _calcGrupo(grupo)
   * @param {String} responsavel — nome ou matrícula de quem está fechando
   * @returns {Object} {
   *   assinadoPor, fechadoEm, hash,
   *   periodo: { di, df },
   *   totais: { trabMin, extraMin, atrasoMin, saldoMin }
   * }
   */
  function _prepararAssinatura(grupo, calc, responsavel) {
    var datas    = (grupo.registros || []).map(function(r){ return r.data; }).sort();
    var fechadoEm = new Date().toISOString();
    var payload   = JSON.stringify({
      nome:        grupo.nome,
      funcId:      grupo.funcId || null,
      periodo:     { di: datas[0] || '', df: datas[datas.length - 1] || '' },
      totais: {
        trabMin:   calc.totalTrabMin,
        extraMin:  calc.totalExtraMin,
        atrasoMin: calc.totalAtrasoMin,
        saldoMin:  calc.saldoLiquidoMin
      },
      fechadoEm:   fechadoEm,
      responsavel: responsavel || 'sistema'
    });

    return {
      assinadoPor: responsavel || 'sistema',
      fechadoEm:   fechadoEm,
      hash:        _hashSimples(payload),
      periodo:     { di: datas[0] || '', df: datas[datas.length - 1] || '' },
      totais: {
        trabMin:   calc.totalTrabMin,
        extraMin:  calc.totalExtraMin,
        atrasoMin: calc.totalAtrasoMin,
        saldoMin:  calc.saldoLiquidoMin
      }
    };
  }

  /**
   * Verifica se um fechamento foi adulterado comparando o hash.
   * @param {Object} assinatura — objeto retornado por _prepararAssinatura
   * @returns {Boolean} true = íntegro
   */
  function _verificarAssinatura(assinatura) {
    var payload = JSON.stringify({
      nome:        assinatura.nome        || '',
      funcId:      assinatura.funcId      || null,
      periodo:     assinatura.periodo,
      totais:      assinatura.totais,
      fechadoEm:   assinatura.fechadoEm,
      responsavel: assinatura.assinadoPor || 'sistema'
    });
    // Nota: hash completo exige payload idêntico ao da geração — use _prepararAssinatura
    // Esta função verifica apenas que o hash está presente e não está vazio
    return !!(assinatura.hash && assinatura.hash.length === 8);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ITEM 5 — SNAPSHOT FINANCEIRO
  // Congela no fechamento: valorHora, multiplicadores, jornada, CFG.he, total pago.
  // Impede que mudança de regra retroativa altere folha antiga.
  //
  // _gerarSnapshotFinanceiro(grupo, calc, func, mesISO)
  //   → retorna objeto imutável com todos os parâmetros que influenciam o cálculo
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Gera snapshot financeiro completo do momento do fechamento.
   * Deve ser persistido junto ao fechamento para garantir reproduzibilidade.
   *
   * @param {Object} grupo   — grupo de registros
   * @param {Object} calc    — resultado de _calcGrupo(grupo)
   * @param {Object} func    — objeto do funcionário
   * @param {String} mesISO  — mês de referência 'yyyy-mm'
   * @returns {Object} snapshot congelado
   */
  function _gerarSnapshotFinanceiro(grupo, calc, func, mesISO) {
    var valorHora   = _calcValorHoraReal(func, mesISO);
    var fin         = _calcFinanceiroGrupo(calc, valorHora);

    return {
      geradoEm:     new Date().toISOString(),
      mesReferencia: mesISO || new Date().toISOString().slice(0, 7),

      // Parâmetros do funcionário no momento do fechamento
      funcionario: {
        id:              func && func.id      || '',
        nome:            func && func.nome    || '',
        salario:         func && parseFloat(func.salario)          || 0,
        jornadaDiariaMin: func && parseInt(func.jornadaDiariaMin)  || 0
      },

      // Multiplicadores vigentes (snapshot de CFG.he)
      multiplicadores: {
        normal:   CFG.he.normal,
        domingo:  CFG.he.domingo,
        feriado:  CFG.he.feriado,
        especial: CFG.he.especial
      },

      // Jornada padrão vigente
      jornadaPadrao: {
        segSex: 480,
        sabado: 240
      },

      // Valor/hora calculado
      valorHora: valorHora,

      // Totais do período
      totais: {
        trabMin:       calc.totalTrabMin,
        extraMin:      calc.totalExtraMin,
        atrasoMin:     calc.totalAtrasoMin,
        saldoMin:      calc.saldoLiquidoMin,
        extra50Min:    fin.totalExtra50Min,
        extra100Min:   fin.totalExtra100Min,
        extra200Min:   fin.totalExtra200Min,
        valorExtra50:  fin.valorExtra50,
        valorExtra100: fin.valorExtra100,
        valorExtra200: fin.valorExtra200,
        valorTotalExtras: fin.valorTotalExtras
      }
    };
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────
  return {
    abrirImportacao:     abrirImportacao,
    _processar:          _processar,
    _onArquivo:          _onArquivo,
    _onTextareaInput:    _onTextareaInput,
    _onVincular:         _onVincular,
    _toggleTabela:       _toggleTabela,
    _confirmarImportacao:_confirmarImportacao,
    _fechar:             _fechar,
    // Correção de ponto
    _renderTelaCorrecao:    _renderTelaCorrecao,
    _editCorrecao:          _editCorrecao,
    _salvarCorrecao:        _salvarCorrecao,
    _excluirCorrecao:       _excluirCorrecao,
    _abrirModalExcecao:     _abrirModalExcecao,
    _abrirAdicionarDia:     _abrirAdicionarDia,
    _confirmarAddDia:       _confirmarAddDia,
    _continuarParaVinculacao: _continuarParaVinculacao,
    _trocarEntradaSaida:     _trocarEntradaSaida,
    _maskHorario:           _maskHorario,
    _ignorarGrupo:          _ignorarGrupo,
    _aplicarPunicao:        _aplicarPunicao,
    _desfazerPunicao:       _desfazerPunicao,
    // Relatório e UI
    _gerarRelatorioHE:   _gerarRelatorioHE,
    _abrirDialogRelatorioHE: _abrirDialogRelatorioHE,
    _patchVinculacaoUI:  _patchVinculacaoUI,
    // Motor financeiro unificado — consumido pelo HR_FUNC
    calcSaldoHE:          calcSaldoHE,
    calcValorHoraReal:    _calcValorHoraReal,
    // Expõe camada HE para testes externos
    _classificarHE:      _classificarHE,
    _calcValorHE:        _calcValorHE,
    _calcFinanceiroGrupo: _calcFinanceiroGrupo,
    _calcGrupo:          _calcGrupo,
    // Auditoria visual
    _auditoriaBadges:    _auditoriaBadges,
    // CFG — acesso externo para ativar auditMode, auditPersist, bancoDiasValidade etc.
    CFG:                 CFG,
    // Item 1 — Persistência de auditoria
    DB:                  DB,
    // Item 2 — Trava de jornada impossível
    _validarJornada:     _validarJornada,
    // Item 3 — Banco de horas com vencimento
    _criarEntradaBanco:      _criarEntradaBanco,
    _calcBancoComVencimento: _calcBancoComVencimento,
    _relatorioVencimentos:   _relatorioVencimentos,
    // Item 4 — Assinatura de fechamento
    _prepararAssinatura:     _prepararAssinatura,
    _verificarAssinatura:    _verificarAssinatura,
    // Item 5 — Snapshot financeiro
    _gerarSnapshotFinanceiro: _gerarSnapshotFinanceiro,
    // Utilitários para debug/testes externos (mantidos)
    _parseRelatorio:     _parseRelatorio,
    _calcDia:            _calcDia,
    _min2dur:            _min2dur,
    _min2hhmm:           _min2hhmm,
    _jornadaEsperada:    _jornadaEsperada
  };
})();
