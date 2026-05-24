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

  // ── Persistência (re-usa o mesmo localStorage do HR_FUNC) ────────────────
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

  /** Jornada esperada (minutos) para uma data ISO. Domingo → 0 (folga). */
  function _jornadaEsperada(isoDate) {
    var d = _dow(isoDate);
    if (d === 0) return 0; // domingo
    return JORNADA[DOW_KEYS[d]] || 480;
  }

  /** Dado entrada, saída (minutos), e a data ISO, retorna {trab, extra, atraso, almoco}. */
  function _calcDia(entMin, saiMin, isoDate) {
    var bruto = saiMin - entMin;
    if (bruto < 0) bruto += 1440; // overnight (improvável mas seguro)

    var d = _dow(isoDate);
    var isSab = (d === 6);
    var jornadaMin = _jornadaEsperada(isoDate);

    // Desconta almoço: apenas seg–sex E turno > 6h E intervalo não registrado separadamente
    var almoco = 0;
    if (!isSab && bruto > 360) almoco = ALMOCO_MIN;

    var trab  = bruto - almoco;
    var extra = Math.max(0, trab - jornadaMin);
    var atraso = Math.max(0, jornadaMin - trab);

    return { bruto: bruto, trab: trab, extra: extra, atraso: atraso, almoco: almoco };
  }

  // ── Design tokens (mesmos do app-funcionarios) ───────────────────────────
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
    periodo: {di:'', df:''}
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
   * Calcula os dados de exibição de um grupo (totais, extra, atraso).
   */
  function _calcGrupo(g) {
    var totalTrabMin = 0, totalExtraMin = 0, totalAtrasoMin = 0;
    var linhasCalc = g.registros.map(function(r) {
      var entMin = _hhmm2min(r.entrada);
      var saiMin = _hhmm2min(r.saida);
      var valido = !isNaN(entMin) && !isNaN(saiMin) && saiMin > entMin;
      var res = valido ? _calcDia(entMin, saiMin, r.data) : { trab:0, extra:0, atraso:0, almoco:0, bruto:0 };
      // Se o relatório forneceu intervalo manualmente, usa ele
      if (valido && r.almocoManual !== null) {
        res.almoco = r.almocoManual;
        res.trab   = res.bruto - res.almoco;
        var jorn   = _jornadaEsperada(r.data);
        res.extra  = Math.max(0, res.trab - jorn);
        res.atraso = Math.max(0, jorn - res.trab);
      }
      totalTrabMin  += res.trab;
      totalExtraMin += res.extra;
      totalAtrasoMin+= res.atraso;
      return { r:r, valido:valido, res:res };
    });
    return {
      linhasCalc: linhasCalc,
      totalTrabMin: totalTrabMin,
      totalExtraMin: totalExtraMin,
      totalAtrasoMin: totalAtrasoMin,
      diasCount: g.registros.length
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UI — TELA DE IMPORTAÇÃO
  // ══════════════════════════════════════════════════════════════════════════

  function abrirImportacao() {
    _state.raw = '';
    _state.linhas = [];
    _state.grupos = [];
    _state.periodo = { di:'', df:'' };
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
  function _xlsParaTexto(workbook) {
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName];

    // Converte para array de arrays (raw: true para pegar seriais brutos)
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
    // Usa _state.raw (arquivo) se disponível, senão usa o textarea direto
    var texto = (_state.raw && _state.raw.trim())
      ? _state.raw
      : ((document.getElementById('imp_texto') || {}).value || '');
    texto = texto.trim();
    // Remove linha de preview "… mais N linha(s)" se presente
    texto = texto.replace(/\n?… mais \d+ linha\(s\)$/, '').trim();
    if (!texto) { _toast('⚠️ Cole ou importe um relatório primeiro.'); return; }

    var registros = _parseRelatorio(texto);
    if (registros.length === 0) {
      _toast('❌ Não foi possível ler nenhum registro. Verifique o formato.');
      return;
    }

    _state.grupos = _vincularAuto(_agrupar(registros));

    var todas = registros.map(function(r){ return r.data; }).sort();
    _state.periodo = { di: todas[0], df: todas[todas.length-1] };

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

        return '<tr style="border-top:1px solid ' + BD + ';">' +
          '<td style="padding:7px 10px;font-size:.72rem;font-weight:700;color:' + corDow + ';white-space:nowrap;">' + _esc(dow) + '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T1 + ';white-space:nowrap;font-weight:600;">' + fmtPer(r.data) + '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T1 + ';white-space:nowrap;">' +
            (r.entrada && r.saida ? '<b>' + _esc(r.entrada) + '</b>→<b>' + _esc(r.saida) + '</b>' : '<span style="color:' + T3 + ';">sem horário</span>') +
          '</td>' +
          '<td style="padding:7px 4px;font-size:.72rem;color:' + T2 + ';white-space:nowrap;">' +
            (lc.valido ? _min2dur(res.trab) : '<span style="color:' + T3 + ';">—</span>') +
            (almocoHtml ? '<br>' + almocoHtml : '') +
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

    _state.grupos.forEach(function(gr) {
      if (!gr.funcId) { semFunc += gr.registros.length; return; }
      var f = funcs[gr.funcId];
      if (!f) { semFunc += gr.registros.length; return; }

      gr.registros.forEach(function(r) {
        // Verifica duplicata
        var dup = Object.values(regs).find(function(rx) {
          return rx.funcionarioId === gr.funcId && rx.data === r.data;
        });
        if (dup) { pulados++; conflitos.push(f.nome.split(' ')[0] + ' · ' + r.data); return; }

        // Calcula horas
        var entMin = _hhmm2min(r.entrada);
        var saiMin = _hhmm2min(r.saida);
        var calc = (!isNaN(entMin) && !isNaN(saiMin) && saiMin > entMin)
          ? _calcDia(entMin, saiMin, r.data)
          : { trab: 0, extra: 0, atraso: 0, almoco: 0 };
        if (r.almocoManual !== null && !isNaN(entMin) && !isNaN(saiMin)) {
          var bruto = saiMin - entMin;
          calc.almoco = r.almocoManual;
          calc.trab   = bruto - calc.almoco;
          var jorn    = _jornadaEsperada(r.data);
          calc.extra  = Math.max(0, calc.trab - jorn);
          calc.atraso = Math.max(0, jorn - calc.trab);
        }

        var id = _genId();
        regs[id] = {
          id: id,
          funcionarioId: gr.funcId,
          data: r.data,
          entrada: r.entrada || '',
          saida: r.saida || '',
          horas: parseFloat((calc.trab / 60).toFixed(4)),
          extra: parseFloat((calc.extra / 60).toFixed(4)),
          tipoExtra: 'normal',
          destinoExtra: 'pagar',
          producao: '',
          instalacao: '',
          ieo: '',
          observacao: 'Importado do relatório de presença',
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
    // Expõe utilitários para debug/testes externos
    _parseRelatorio:     _parseRelatorio,
    _calcDia:            _calcDia,
    _min2dur:            _min2dur,
    _min2hhmm:           _min2hhmm
  };
})();
