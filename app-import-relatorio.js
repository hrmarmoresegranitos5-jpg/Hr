// ══════════════════════════════════════════════════════════════
// APP-IMPORT-RELATORIO — HR Mármores e Granitos
// Importação do Relatório de Presença (.xls/.xlsx/.csv)
// gerado pelo sistema de ponto biométrico.
//
// CÁLCULO DE HORAS EXTRAS:
//   • Dia útil (seg–sex): meta = 8h00  → extra = trabalhado - 8h
//   • Sábado             : meta = 4h00  → extra = trabalhado - 4h
//   • Domingo            : meta = 0h    → todo o trabalhado é extra
//   Precisão: minuto a minuto (HH:MM exatos), armazenado em horas float.
// ══════════════════════════════════════════════════════════════

var HR_IMPORT = (function () {

  // ── Design tokens ───────────────────────────────────────────
  var GOLD  = '#C9A84C', GOLD2 = 'rgba(201,168,76,.15)', GOLDB = 'rgba(201,168,76,.35)';
  var BG    = 'var(--bg,#0d0c09)', S2 = 'var(--s2,#161410)';
  var BD    = 'rgba(201,168,76,.12)', BD2 = 'rgba(255,255,255,.07)';
  var T1    = 'var(--t1,#f0ece4)', T2 = 'var(--t2,#b8b0a0)', T3 = 'var(--t3,#7a7268)';
  var GREEN = '#5cb85c', RED = '#c85c5c', BLUE = '#5c8ec8';

  var CSS_BTN_GOLD = 'width:100%;padding:14px;border-radius:11px;' +
    'background:linear-gradient(135deg,#1c1600,#0d0b00);' +
    'border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' +
    'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;' +
    'cursor:pointer;margin-bottom:8px;letter-spacing:.04em;';
  var CSS_BTN_GHOST = 'width:100%;padding:12px;border-radius:11px;' +
    'background:transparent;border:1px solid ' + BD2 + ';' +
    'color:' + T2 + ';font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;margin-bottom:6px;';

  // ── Dados em memória ─────────────────────────────────────────
  var _parsedData = null;
  var _matchMap   = {};

  // ── Utilitários ──────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function _toast(m) {
    if (typeof toast === 'function') toast(m); else alert(m);
  }
  function _getFuncionarios() {
    try { return JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) { return {}; }
  }
  function _getRegistros() {
    try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch (e) { return {}; }
  }
  function _saveRegistros(d) { localStorage.setItem('hr_registros', JSON.stringify(d)); }
  function _genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ── Overlay helpers ──────────────────────────────────────────
  function _closeOverlay() { var e = document.getElementById('hrImportOverlay'); if (e) e.remove(); }
  function _setContent(html) { var b = document.getElementById('hrImportBody'); if (b) b.innerHTML = html; }

  // ── Carrega SheetJS ──────────────────────────────────────────
  function _loadXLSX(cb) {
    if (window.XLSX) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = cb;
    s.onerror = function () {
      _setContent('<div style="text-align:center;padding:32px;color:' + RED + ';">' +
        '❌ Sem conexão para carregar o leitor de planilhas.<br><br>' +
        '<small style="color:' + T3 + ';">Conecte-se à internet e tente novamente.</small></div>');
    };
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSORES DE FORMATO
  // ═══════════════════════════════════════════════════════════════

  // Serial Excel → "YYYY-MM-DD"
  function _excelDateToISO(serial) {
    if (!serial && serial !== 0) return null;
    if (typeof serial === 'string') {
      var m;
      if ((m = serial.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/))) return m[1]+'-'+m[2]+'-'+m[3];
      if ((m = serial.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/))) return m[3]+'-'+m[2]+'-'+m[1];
      return null;
    }
    if (typeof serial === 'number') {
      var d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      var y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dy = d.getUTCDate();
      return y + '-' + (mo < 10 ? '0' + mo : mo) + '-' + (dy < 10 ? '0' + dy : dy);
    }
    return null;
  }

  // Qualquer formato de hora → "HH:MM" (string) ou null
  // Aceita: serial Excel (0..1), string "HH:MM", "HH:MM:SS", "H:MM", número inteiro como "730" (HHMM)
  function _toHHMM(v) {
    if (v === null || v === undefined || v === '') return null;

    // String
    if (typeof v === 'string') {
      v = v.trim();
      // "HH:MM:SS" ou "HH:MM"
      var m = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (m) {
        var hh = parseInt(m[1], 10), mm = parseInt(m[2], 10);
        return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      }
      // "0730" ou "730" (HHMM sem separador)
      var m2 = v.match(/^(\d{1,2})(\d{2})$/);
      if (m2) {
        var hh2 = parseInt(m2[1], 10), mm2 = parseInt(m2[2], 10);
        return (hh2 < 10 ? '0' : '') + hh2 + ':' + (mm2 < 10 ? '0' : '') + mm2;
      }
      // Tenta parsear como número
      var n = parseFloat(v);
      if (!isNaN(n)) return _toHHMM(n);
      return null;
    }

    // Número
    if (typeof v === 'number') {
      // Serial Excel: fração do dia (0 = 00:00, 0.5 = 12:00, etc.)
      if (v >= 0 && v < 1) {
        var totalSeg = Math.round(v * 86400);
        var h = Math.floor(totalSeg / 3600);
        var m3 = Math.floor((totalSeg % 3600) / 60);
        return (h < 10 ? '0' : '') + h + ':' + (m3 < 10 ? '0' : '') + m3;
      }
      // Número inteiro como 730 → "07:30"
      if (v >= 100 && v < 2400) {
        var hInt = Math.floor(v / 100), mInt = v % 100;
        if (mInt < 60 && hInt < 24) {
          return (hInt < 10 ? '0' : '') + hInt + ':' + (mInt < 10 ? '0' : '') + mInt;
        }
      }
      // Pode ser minutos totais (ex: 480 = 08:00)
      if (v >= 1 && v < 1440) {
        var hm = Math.floor(v / 60), mm3 = Math.round(v % 60);
        return (hm < 10 ? '0' : '') + hm + ':' + (mm3 < 10 ? '0' : '') + mm3;
      }
      return null;
    }
    return null;
  }

  // "HH:MM" → minutos inteiros
  function _hhmm2min(hhmm) {
    if (!hhmm) return null;
    var p = hhmm.split(':');
    if (p.length < 2) return null;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  // minutos → "HH:MM"
  function _min2hhmm(min) {
    if (min < 0) min = 0;
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // minutos → horas float com 2 casas (ex: 90 → 1.50)
  function _min2h(min) { return Math.round(min / 60 * 100) / 100; }

  // ═══════════════════════════════════════════════════════════════
  // CÁLCULO PRINCIPAL DE HORAS — Regra da empresa
  //   Dia útil (0=Dom,1=Seg..5=Sex): meta 8h = 480 min
  //   Sábado (6): meta 4h = 240 min
  //   Domingo (0): meta 0h = todo trabalhado vira extra
  // ═══════════════════════════════════════════════════════════════
  function _calcHoras(dataISO, entradaHHMM, saidaHHMM) {
    var result = { horas: 0, extra: 0, atraso: 0, deficit: 0 };
    if (!entradaHHMM || !saidaHHMM) return result;

    var minEntrada = _hhmm2min(entradaHHMM);
    var minSaida   = _hhmm2min(saidaHHMM);
    if (minEntrada === null || minSaida === null) return result;

    // Saída pode ser no dia seguinte (ex: turno noturno)
    if (minSaida < minEntrada) minSaida += 1440;

    var trabalhado = minSaida - minEntrada; // minutos trabalhados
    result.horas = _min2h(trabalhado);

    // Determina meta pelo dia da semana
    var meta = 480; // padrão: 8h
    if (dataISO) {
      // Cria data em UTC para evitar problema de fuso
      var parts = dataISO.split('-');
      var dt = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      var dow = dt.getUTCDay(); // 0=Dom, 6=Sáb
      if (dow === 6) meta = 240;      // Sábado: meta 4h
      else if (dow === 0) meta = 0;   // Domingo: meta 0h
      else meta = 480;                // Seg-Sex: meta 8h
    }

    var diff = trabalhado - meta;
    if (diff > 0) {
      result.extra = _min2h(diff);    // horas extras positivas
    } else if (diff < 0) {
      result.atraso  = _min2h(-diff); // minutos faltantes (atraso/falta)
      result.deficit = _min2h(-diff);
    }

    return result;
  }

  // ── Normaliza nome para matching ─────────────────────────────
  function _normNome(n) {
    return String(n || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, '').trim();
  }

  // ── Auto-match nome do relatório → funcionário ───────────────
  function _autoMatch(nomeRel) {
    var funcs = _getFuncionarios();
    var norm  = _normNome(nomeRel);
    var primRel = norm.split(' ')[0];
    var best = null, bestScore = 0;
    Object.values(funcs).forEach(function (f) {
      var fn   = _normNome(f.nome);
      var prim = fn.split(' ')[0];
      var score = 0;
      if (fn === norm)                                              score = 100;
      else if (prim === primRel)                                    score = 60;
      else if (fn.indexOf(primRel) !== -1 || norm.indexOf(prim) !== -1) score = 40;
      if (score > bestScore) { bestScore = score; best = f.id; }
    });
    return bestScore >= 40 ? best : '';
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSE DA PLANILHA
  // ═══════════════════════════════════════════════════════════════
  function _parseWorkbook(wb) {
    var rows = [];
    var targetSheet = null;

    var sheetNames = wb.SheetNames;
    for (var i = 0; i < sheetNames.length; i++) {
      var sn = sheetNames[i].toLowerCase();
      if (sn.indexOf('shift') !== -1 || sn.indexOf('attendance') !== -1 ||
          sn.indexOf('presen') !== -1 || sn.indexOf('ponto') !== -1) {
        targetSheet = sheetNames[i]; break;
      }
    }
    if (!targetSheet) targetSheet = sheetNames[0];

    var ws  = wb.Sheets[targetSheet];
    var raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

    if (!raw || raw.length < 2) return [];

    // Detecta linha de cabeçalho (busca até linha 12)
    var headerRow = -1, cols = {};
    for (var r = 0; r < Math.min(raw.length, 12); r++) {
      var rowStr = raw[r].join(' ').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (rowStr.indexOf('nome') !== -1 || rowStr.indexOf('name') !== -1 ||
          rowStr.indexOf('funcionario') !== -1) {
        headerRow = r; break;
      }
    }
    if (headerRow === -1) {
      for (var r2 = 0; r2 < raw.length; r2++) {
        if (raw[r2].some(function(c){ return c !== ''; })) { headerRow = r2; break; }
      }
    }

    var headers = raw[headerRow] || [];
    headers.forEach(function (h, idx) {
      var hn = _normNome(String(h));
      if      (/\bnome\b|\bfuncion|\bname\b/.test(hn))              cols.nome    = idx;
      else if (/\bdata\b|\bdate\b|\bdia\b/.test(hn))               cols.data    = idx;
      else if (/entrada|check.?in|inicio/.test(hn))                 cols.entrada = idx;
      else if (/saida|sair|check.?out|fim/.test(hn))                cols.saida   = idx;
      else if (/observ|obs\b|note/.test(hn))                        cols.obs     = idx;
      // Colunas extras/atraso da planilha são IGNORADAS — recalculamos do zero
    });

    // Fallback por posição (layout fixo sem cabeçalho reconhecido)
    if (cols.nome === undefined) {
      cols.nome = 0; cols.data = 1; cols.entrada = 2; cols.saida = 3;
    }

    // Lê linhas de dados
    for (var dr = headerRow + 1; dr < raw.length; dr++) {
      var row  = raw[dr];
      var nome = String(row[cols.nome] || '').trim();
      if (!nome || nome.length < 2) continue;
      var normN = _normNome(nome);
      if (normN === 'total' || normN === 'nome' || normN === 'name' ||
          normN === 'funcionario') continue;

      var dataISO  = _excelDateToISO(row[cols.data]);
      var entrada  = _toHHMM(row[cols.entrada]);
      var saida    = _toHHMM(row[cols.saida]);

      // ── CÁLCULO PRECISO: ignoramos os valores da planilha ──
      var calc = _calcHoras(dataISO, entrada, saida);

      var obsV = String(row[cols.obs !== undefined ? cols.obs : -1] || '').trim();

      rows.push({
        nome:    nome,
        data:    dataISO,
        entrada: entrada,
        saida:   saida,
        horas:   calc.horas,
        extra:   calc.extra,
        atraso:  calc.atraso,
        deficit: calc.deficit,
        obs:     obsV
      });
    }

    return rows;
  }

  // ── STEP 1: Upload ───────────────────────────────────────────
  function _buildStep1Html() {
    return '<div style="text-align:center;padding:24px 0;">' +
      '<div style="font-size:3rem;margin-bottom:12px;">📂</div>' +
      '<div style="font-size:.9rem;font-weight:700;color:' + T1 + ';margin-bottom:6px;">' +
        'Selecione o Relatório de Presença</div>' +
      '<div style="font-size:.72rem;color:' + T3 + ';margin-bottom:20px;line-height:1.6;">' +
        'Arquivos .xls ou .xlsx exportados pelo<br>sistema de ponto biométrico' +
      '</div>' +
      '<label style="display:block;border:2px dashed ' + GOLDB + ';border-radius:14px;' +
        'padding:28px 20px;cursor:pointer;background:' + GOLD2 + ';margin-bottom:16px;">' +
        '<input type="file" id="hrImportFile" accept=".xls,.xlsx,.csv" ' +
          'style="display:none;" onchange="HR_IMPORT._onFile(this)">' +
        '<div style="font-size:1.8rem;margin-bottom:8px;">📊</div>' +
        '<div style="font-size:.82rem;color:' + GOLD + ';font-weight:700;">Toque para escolher arquivo</div>' +
        '<div style="font-size:.68rem;color:' + T3 + ';margin-top:4px;">.xls · .xlsx · .csv</div>' +
      '</label>' +
      '<div style="background:rgba(92,142,200,.06);border:1px solid rgba(92,142,200,.2);' +
        'border-radius:10px;padding:12px 14px;text-align:left;margin-bottom:16px;">' +
        '<div style="font-size:.68rem;font-weight:700;color:' + BLUE + ';margin-bottom:6px;">ℹ Regras de cálculo</div>' +
        '<div style="font-size:.67rem;color:' + T3 + ';line-height:1.8;">' +
          '⏱ Horas extras calculadas da entrada/saída exata<br>' +
          '📅 Seg–Sex: meta <strong style="color:' + T1 + ';">8h</strong> · ' +
          'Sáb: meta <strong style="color:' + T1 + ';">4h</strong> · ' +
          'Dom: meta <strong style="color:' + T1 + ';">0h</strong><br>' +
          '⚡ Extra = tempo trabalhado − meta (em min/seg)' +
        '</div>' +
      '</div>' +
      '<button onclick="HR_IMPORT._fechar()" style="' + CSS_BTN_GHOST + '">Cancelar</button>' +
    '</div>';
  }

  // ── STEP 2: Preview + vinculação ─────────────────────────────
  function _buildStep2Html() {
    var dados    = _parsedData;
    var funcs    = _getFuncionarios();
    var funcList = Object.values(funcs);

    var porNome = {};
    dados.forEach(function (r) {
      if (!porNome[r.nome]) porNome[r.nome] = { nome: r.nome, dias: 0, horas: 0, extra: 0, atraso: 0, datas: [] };
      porNome[r.nome].dias++;
      porNome[r.nome].horas  += r.horas;
      porNome[r.nome].extra  += r.extra;
      porNome[r.nome].atraso += r.atraso;
      if (r.data) porNome[r.nome].datas.push(r.data);
    });

    var nomes = Object.keys(porNome);
    if (nomes.length === 0) {
      return '<div style="text-align:center;padding:32px;color:' + RED + ';">' +
        '⚠ Nenhum dado encontrado no arquivo.<br><br>' +
        '<small style="color:' + T3 + ';">Verifique se é o relatório de ponto correto.</small>' +
        '<br><br><button onclick="HR_IMPORT._fechar()" style="' + CSS_BTN_GHOST + '">Fechar</button>' +
      '</div>';
    }

    var todasDatas = dados.filter(function(r){ return r.data; }).map(function(r){ return r.data; }).sort();
    var periodo = todasDatas.length > 0
      ? _fmtData(todasDatas[0]) + ' a ' + _fmtData(todasDatas[todasDatas.length - 1])
      : dados.length + ' registros';

    var funcOpts = '<option value="">— Não importar —</option>' +
      funcList.map(function (f) {
        return '<option value="' + _esc(f.id) + '">' + _esc(f.nome) + '</option>';
      }).join('');

    // Mostra preview dos dias de cada funcionário
    var rows = nomes.map(function (nome) {
      var g = porNome[nome];
      var matchId   = _matchMap[nome] !== undefined ? _matchMap[nome] : _autoMatch(nome);
      _matchMap[nome] = matchId;

      var matchColor = matchId ? GREEN : T3;
      var matchIcon  = matchId ? '✓' : '?';

      // Preview dos registros diários deste funcionário
      var diasDados = dados.filter(function(r){ return r.nome === nome; })
        .sort(function(a,b){ return (a.data||'').localeCompare(b.data||''); });

      var diasHtml = diasDados.map(function(d) {
        var extraCor = d.extra > 0 ? GOLD : (d.atraso > 0 ? RED : T3);
        var extraTxt = d.extra > 0
          ? '⚡ +' + _min2hhmm(Math.round(d.extra * 60))
          : (d.atraso > 0 ? '⚠ -' + _min2hhmm(Math.round(d.atraso * 60)) : '✓ exato');
        var dowLabel = '';
        if (d.data) {
          var parts = d.data.split('-');
          var dt = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])));
          dowLabel = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dt.getUTCDay()];
        }
        return '<div style="display:flex;justify-content:space-between;align-items:center;' +
          'padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.64rem;">' +
          '<span style="color:' + T3 + ';min-width:34px;">' + dowLabel + '</span>' +
          '<span style="color:' + T2 + ';min-width:70px;">' + _fmtData(d.data) + '</span>' +
          '<span style="color:' + T2 + ';">' + (d.entrada||'--:--') + '→' + (d.saida||'--:--') + '</span>' +
          '<span style="color:' + T2 + ';margin:0 4px;">' + d.horas.toFixed(2) + 'h</span>' +
          '<span style="color:' + extraCor + ';font-weight:700;">' + extraTxt + '</span>' +
        '</div>';
      }).join('');

      return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;' +
        'padding:12px 14px;margin-bottom:9px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
          '<span data-match-nome="' + _esc(nome) + '" style="font-size:.8rem;color:' + matchColor + ';">' + matchIcon + '</span>' +
          '<div style="flex:1;">' +
            '<div style="font-size:.85rem;font-weight:700;color:' + T1 + ';">' + _esc(nome) + '</div>' +
            '<div style="font-size:.67rem;color:' + T3 + ';">' +
              g.dias + ' dia(s) · ' + g.horas.toFixed(2) + 'h trabalhadas · ' +
              '<span style="color:' + (g.extra > 0 ? GOLD : T3) + ';">⚡ +' + g.extra.toFixed(2) + 'h extras</span>' +
              (g.atraso > 0 ? ' · <span style="color:' + RED + ';">⚠ -' + g.atraso.toFixed(2) + 'h</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        // Preview detalhado por dia (colapsável)
        '<details style="margin-bottom:8px;">' +
          '<summary style="font-size:.64rem;color:' + BLUE + ';cursor:pointer;padding:4px 0;list-style:none;">' +
            '▶ Ver detalhe por dia (' + diasDados.length + ' registros)' +
          '</summary>' +
          '<div style="margin-top:6px;padding:6px 8px;background:rgba(255,255,255,.02);' +
            'border-radius:8px;border:1px solid rgba(255,255,255,.05);">' +
            '<div style="display:flex;justify-content:space-between;font-size:.58rem;color:' + T3 + ';' +
              'padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:2px;">' +
              '<span>Dia</span><span>Data</span><span>Entrada→Saída</span><span>Total</span><span>Extra/Falta</span>' +
            '</div>' +
            diasHtml +
          '</div>' +
        '</details>' +
        '<select onchange="HR_IMPORT._setMatch(\'' + _esc(nome) + '\',this.value)" ' +
          'style="width:100%;padding:9px 11px;border-radius:9px;border:1px solid ' + BD + ';' +
          'background:#0f0e0c;color:' + T1 + ';font-family:Outfit,sans-serif;font-size:.8rem;">' +
          funcOpts.replace('value="' + _esc(matchId) + '"', 'value="' + _esc(matchId) + '" selected') +
        '</select>' +
      '</div>';
    }).join('');

    return '<div>' +
      '<div style="background:rgba(92,142,200,.06);border:1px solid rgba(92,142,200,.2);' +
        'border-radius:11px;padding:12px 14px;margin-bottom:16px;display:flex;gap:14px;">' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + BLUE + ';">' + dados.length + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">registros</div>' +
        '</div>' +
        '<div style="flex:1;text-align:center;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:' + GOLD + ';">' + nomes.length + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">funcionários</div>' +
        '</div>' +
        '<div style="flex:2;text-align:center;">' +
          '<div style="font-size:.78rem;font-weight:700;color:' + T2 + ';">' + periodo + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">período</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px;">' +
        'Vincule cada nome ao funcionário correto' +
      '</div>' +
      rows +
      '<div style="margin-top:4px;">' +
        '<button onclick="HR_IMPORT._confirmar()" style="' + CSS_BTN_GOLD + '">✅ Importar registros</button>' +
        '<button onclick="HR_IMPORT._fechar()" style="' + CSS_BTN_GHOST + '">Cancelar</button>' +
      '</div>' +
    '</div>';
  }

  // ── Handler: arquivo selecionado ─────────────────────────────
  function _onFile(input) {
    var file = input.files[0];
    if (!file) return;

    _setContent('<div style="text-align:center;padding:40px;">' +
      '<div style="font-size:2rem;margin-bottom:12px;">⏳</div>' +
      '<div style="font-size:.82rem;color:' + T3 + ';">Carregando leitor de planilhas…</div>' +
    '</div>');

    _loadXLSX(function () {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb   = XLSX.read(data, { type: 'array', cellDates: false });
          _parsedData = _parseWorkbook(wb);
          _matchMap   = {};
          _setContent(_buildStep2Html());
        } catch (err) {
          _setContent('<div style="text-align:center;padding:32px;color:' + RED + ';">' +
            '❌ Erro ao ler o arquivo:<br><br>' +
            '<code style="font-size:.72rem;color:' + T3 + ';">' + _esc(err.message) + '</code>' +
            '<br><br><button onclick="HR_IMPORT._fechar()" style="' + CSS_BTN_GHOST + '">Fechar</button>' +
          '</div>');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Handler: muda vínculo ────────────────────────────────────
  function _setMatch(nome, funcId) {
    _matchMap[nome] = funcId;
    var icon = document.querySelector('[data-match-nome="' + CSS.escape(nome) + '"]');
    if (icon) {
      icon.textContent = funcId ? '✓' : '?';
      icon.style.color = funcId ? GREEN : T3;
    }
  }

  // ── Confirmar importação ─────────────────────────────────────
  function _confirmar() {
    if (!_parsedData) return;

    var regs = _getRegistros();
    var criados = 0, pulados = 0, semVinculo = 0;

    _parsedData.forEach(function (r) {
      var funcId = _matchMap[r.nome];
      if (!funcId) { semVinculo++; return; }

      // Não duplica: mesmo funcionário + mesma data
      var jaExiste = Object.values(regs).some(function (e) {
        return e.funcionarioId === funcId && e.data === r.data;
      });
      if (jaExiste) { pulados++; return; }

      var id = _genId();
      regs[id] = {
        id:            id,
        funcionarioId: funcId,
        data:          r.data    || '',
        entrada:       r.entrada || '',
        saida:         r.saida   || '',
        horas:         r.horas,
        extra:         r.extra,
        tipoExtra:     'normal',
        destinoExtra:  'pagar',
        producao:      '',
        instalacao:    '',
        ieo:           r.atraso > 0
          ? 'Falta/Atraso: ' + _min2hhmm(Math.round(r.atraso * 60)) + 'h (' + r.atraso.toFixed(2) + 'h)'
          : '',
        observacao:    'Importado · ' + (r.obs || '').slice(0, 80)
      };
      criados++;
    });

    _saveRegistros(regs);

    _setContent(
      '<div style="text-align:center;padding:24px 0;">' +
        '<div style="font-size:3rem;margin-bottom:12px;">' + (criados > 0 ? '✅' : '⚠️') + '</div>' +
        '<div style="font-size:1rem;font-weight:800;color:' + T1 + ';margin-bottom:16px;">' +
          'Importação ' + (criados > 0 ? 'concluída' : 'sem novidades') +
        '</div>' +
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;' +
          'padding:14px 18px;margin-bottom:16px;text-align:left;">' +
          _resultRow('✅', 'Registros criados', criados, GREEN) +
          _resultRow('⏭', 'Já existiam (pulados)', pulados, T3) +
          _resultRow('⚠', 'Sem vínculo (ignorados)', semVinculo, RED) +
        '</div>' +
        (criados > 0
          ? '<div style="font-size:.72rem;color:' + T3 + ';margin-bottom:16px;">' +
              'Os registros aparecem em <strong style="color:' + GOLD + ';">Histórico de Registros</strong><br>' +
              'de cada funcionário com horas calculadas ao minuto.' +
            '</div>'
          : '') +
        '<button onclick="HR_IMPORT._fechar();if(typeof HR_FUNC!==\'undefined\')HR_FUNC.renderPaginaFuncionarios();" ' +
          'style="' + CSS_BTN_GOLD + '">Concluir</button>' +
      '</div>'
    );
  }

  function _resultRow(ico, label, valor, cor) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'padding:7px 0;border-bottom:1px solid ' + BD + ';">' +
      '<div style="font-size:.8rem;color:' + T2 + ';">' + ico + ' ' + label + '</div>' +
      '<div style="font-size:.9rem;font-weight:800;color:' + cor + ';">' + valor + '</div>' +
    '</div>';
  }

  // ── Abre overlay ─────────────────────────────────────────────
  function abrirImportacao() {
    var prev = document.getElementById('hrImportOverlay');
    if (prev) prev.remove();

    var ov = document.createElement('div');
    ov.id = 'hrImportOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,7,4,.97);' +
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;' +
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';

    ov.innerHTML =
      '<div style="width:100%;max-width:500px;padding:0 16px;">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
          '<div>' +
            '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
            '<div style="font-size:1.3rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">📥 Importar Relatório</div>' +
            '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">Horas calculadas ao minuto · 8h/dia · 4h/sáb</div>' +
          '</div>' +
          '<button onclick="HR_IMPORT._fechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
        '</div>' +
        '<div id="hrImportBody"></div>' +
      '</div>';

    document.body.appendChild(ov);
    document.getElementById('hrImportBody').innerHTML = _buildStep1Html();
  }

  function _fechar() {
    var e = document.getElementById('hrImportOverlay');
    if (e) e.remove();
    _parsedData = null;
    _matchMap   = {};
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    abrirImportacao: abrirImportacao,
    _fechar:         _fechar,
    _onFile:         _onFile,
    _setMatch:       _setMatch,
    _confirmar:      _confirmar
  };

})();
