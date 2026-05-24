// ══════════════════════════════════════════════════════════════
// APP-IMPORT-RELATORIO — HR Mármores e Granitos  v3.0
//
// Parser específico para o relatório do ponto biométrico:
//   • Formato: "Tabela de presença de funcionários"
//   • 3 funcionários por aba, lado a lado (blocos de 15 colunas)
//   • Horários divididos em: manhã (entrada/saída), tarde, extra
//   • Horários como datetime.time (não serial Excel)
//   • Entrada real = menor horário do dia; Saída = maior horário
//
// CÁLCULO DE EXTRAS (próprio, ignorando valores da planilha):
//   Seg–Sex: meta 8h → extra = trabalhado − 480 min
//   Sábado : meta 4h → extra = trabalhado − 240 min
//   Domingo: meta 0h → tudo é extra
// ══════════════════════════════════════════════════════════════

var HR_IMPORT = (function () {

  // ── Tokens ───────────────────────────────────────────────────
  var GOLD  = '#C9A84C', GOLD2 = 'rgba(201,168,76,.15)', GOLDB = 'rgba(201,168,76,.35)';
  var S2    = 'var(--s2,#161410)';
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

  var _parsedData = null;
  var _matchMap   = {};

  // ── Utilitários ──────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function _toast(m) { if (typeof toast === 'function') toast(m); else alert(m); }
  function _getFuncionarios() {
    try { return JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e){ return {}; }
  }
  function _getRegistros() {
    try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch(e){ return {}; }
  }
  function _saveRegistros(d) { localStorage.setItem('hr_registros', JSON.stringify(d)); }
  function _genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function _setContent(html) { var b = document.getElementById('hrImportBody'); if(b) b.innerHTML = html; }

  // ── Carrega SheetJS ──────────────────────────────────────────
  function _loadXLSX(cb) {
    if (window.XLSX) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = cb;
    s.onerror = function() {
      _setContent('<div style="text-align:center;padding:32px;color:'+RED+';">❌ Sem conexão para carregar o leitor.</div>');
    };
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSORES
  // ═══════════════════════════════════════════════════════════════

  // Qualquer valor de hora → minutos inteiros (0..1439) ou null
  function _toMin(v) {
    if (v === null || v === undefined || v === '') return null;

    if (typeof v === 'string') {
      v = v.trim();
      // "HH:MM" ou "HH:MM:SS"
      var m = v.match(/^(\d{1,2}):(\d{2})(?::\d+)?/);
      if (m) return parseInt(m[1],10)*60 + parseInt(m[2],10);
      // Tenta como número
      var n = parseFloat(v);
      if (!isNaN(n)) return _toMin(n);
      return null;
    }

    if (typeof v === 'number') {
      // Serial Excel fração de dia (0..1)
      if (v >= 0 && v < 1) {
        return Math.round(v * 1440);
      }
      // Inteiro HHMM (730 = 07:30)
      if (v >= 100 && v < 2400) {
        var h = Math.floor(v/100), m2 = v % 100;
        if (m2 < 60 && h < 24) return h*60 + m2;
      }
      return null;
    }
    return null;
  }

  // Minutos → "HH:MM"
  function _min2hhmm(min) {
    if (min === null || min < 0) return null;
    var h = Math.floor(min/60), m = min%60;
    return (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
  }

  // Minutos → horas float (2 casas)
  function _min2h(min) { return Math.round(min/60*100)/100; }

  // Serial Excel data → "YYYY-MM-DD"
  function _excelDateToISO(serial) {
    if (!serial && serial !== 0) return null;
    if (typeof serial === 'string') {
      var m;
      if ((m = serial.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/))) return m[1]+'-'+m[2]+'-'+m[3];
      if ((m = serial.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/))) return m[3]+'-'+m[2]+'-'+m[1];
    }
    if (typeof serial === 'number') {
      var d = new Date(Math.round((serial-25569)*86400*1000));
      var y = d.getUTCFullYear(), mo = d.getUTCMonth()+1, dy = d.getUTCDate();
      return y+'-'+(mo<10?'0':'')+mo+'-'+(dy<10?'0':'')+dy;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // CÁLCULO DE HORAS EXTRAS
  // ═══════════════════════════════════════════════════════════════
  function _calcHoras(dataISO, entradaMin, saidaMin) {
    var res = { horas:0, extra:0, atraso:0 };
    if (entradaMin === null || saidaMin === null) return res;
    var trabalhado = saidaMin - entradaMin;
    if (trabalhado < 0) trabalhado += 1440;
    res.horas = _min2h(trabalhado);

    var meta = 480; // seg-sex 8h
    if (dataISO) {
      var p = dataISO.split('-');
      // getUTCDay: 0=dom,1=seg,...,5=sex,6=sab
      var dow = new Date(Date.UTC(+p[0],+p[1]-1,+p[2])).getUTCDay();
      if (dow === 6) meta = 240;   // sábado 4h
      else if (dow === 0) meta = 0; // domingo
    }

    var diff = trabalhado - meta;
    if (diff > 0)      res.extra  = _min2h(diff);
    else if (diff < 0) res.atraso = _min2h(-diff);
    return res;
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSER DO RELATÓRIO DE PRESENÇA BIOMÉTRICO
  //
  // Estrutura do arquivo:
  //   Abas: "1,2,3" e "4,5,6" (3 funcionários por aba, lado a lado)
  //   Cada bloco ocupa 15 colunas (base 0, 15, 30)
  //   Dentro de cada bloco:
  //     +0  = label do dia ("04 2ª", "09 Sá", ...)
  //     +1  = manhã entrada
  //     +3  = manhã saída
  //     +6  = tarde entrada
  //     +8  = tarde saída
  //     +10 = hora extra entrada
  //     +12 = hora extra saída
  //   Nomes: linha idx 3, colunas 9, 24, 39
  //   Período: linha idx 4, coluna 1
  // ═══════════════════════════════════════════════════════════════
  function _parseWorkbook(wb) {
    var rows = [];

    // Abas com cartão de ponto (presença por dia)
    var PRESENCA_SHEETS = [];
    wb.SheetNames.forEach(function(sn) {
      var snl = sn.toLowerCase();
      // "1,2,3" e "4,5,6" ou qualquer aba com "presen" ou "cartão"
      if (/^\d+,\d+/.test(sn) || snl.indexOf('presen') !== -1 || snl.indexOf('cart') !== -1) {
        PRESENCA_SHEETS.push(sn);
      }
    });

    // Fallback: se não achou o formato específico, tenta parse genérico
    if (PRESENCA_SHEETS.length === 0) {
      return _parseGenerico(wb);
    }

    // Offsets dos horários dentro de cada bloco de 15 colunas
    var TIME_OFFSETS = [1, 3, 6, 8, 10, 12];
    // Posições dos nomes no bloco (col base + 9)
    var NOME_COL_OFFSETS = [9, 24, 39];  // dentro da linha de nomes
    var BLOCK_BASES      = [0, 15, 30];  // base de cada bloco

    PRESENCA_SHEETS.forEach(function(sheetName) {
      var ws  = wb.Sheets[sheetName];
      var raw = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null });
      if (!raw || raw.length < 10) return;

      // ── Extrair período (ano e mês) ──
      // Busca algo como "01/05/2026~23/05/2026" nas primeiras 6 linhas
      var year = new Date().getFullYear().toString();
      var monthStr = ('0' + (new Date().getMonth()+1)).slice(-2);
      for (var ri = 0; ri < Math.min(raw.length, 6); ri++) {
        var rowStr = (raw[ri] || []).join(' ');
        var dm = rowStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dm) { monthStr = dm[2]; year = dm[3]; break; }
      }

      // ── Extrair nomes (linha onde aparecem "Nome" e os nomes reais) ──
      // Procura linha com 'Nome' ou 'nome' e verifica col 9
      var nomes = ['', '', ''];
      for (var ri2 = 0; ri2 < Math.min(raw.length, 8); ri2++) {
        var row = raw[ri2] || [];
        // Linha de nomes: col 8='Nome', col 9=nome1, col 23='Nome', col 24=nome2 ...
        if (String(row[8]||'').toLowerCase() === 'nome' && row[9]) {
          nomes[0] = String(row[9]).trim();
          nomes[1] = row[24] ? String(row[24]).trim() : '';
          nomes[2] = row[39] ? String(row[39]).trim() : '';
          break;
        }
      }

      // ── Encontrar linha onde começam os dados (padrão "DD Dia") ──
      var dataStart = -1;
      for (var ri3 = 0; ri3 < raw.length; ri3++) {
        var cell0 = String(raw[ri3][0] || '');
        var cell15 = String(raw[ri3][15] || '');
        var cell30 = String(raw[ri3][30] || '');
        if (/^\d{2}\s+\S/.test(cell0) || /^\d{2}\s+\S/.test(cell15) || /^\d{2}\s+\S/.test(cell30)) {
          dataStart = ri3;
          break;
        }
      }
      if (dataStart === -1) return;

      // ── Processar cada bloco (funcionário) ──
      BLOCK_BASES.forEach(function(base, bi) {
        var nome = nomes[bi];
        if (!nome) return;

        for (var ri4 = dataStart; ri4 < raw.length; ri4++) {
          var row = raw[ri4];
          if (!row) continue;

          var cellData = row[base];
          if (!cellData) continue;
          var labelStr = String(cellData).trim();

          // Padrão: "04 2ª" ou "09 Sá" etc.
          var dlm = labelStr.match(/^(\d{2})\s+\S/);
          if (!dlm) continue;

          var dia = parseInt(dlm[1], 10);
          var dataISO = year + '-' + monthStr + '-' + (dia < 10 ? '0' : '') + dia;

          // ── Leitura semântica dos pares de batidas ──
          // +1=manhã entrada, +3=manhã saída
          // +6=tarde entrada, +8=tarde saída
          // +10=extra entrada, +12=extra saída
          var PAIRS = [[1,3],[6,8],[10,12]];
          var entMin = null, saiMin = null;

          PAIRS.forEach(function(pair) {
            var colEnt = base + pair[0];
            var colSai = base + pair[1];
            var vEnt = (colEnt < row.length) ? _toMin(row[colEnt]) : null;
            var vSai = (colSai < row.length) ? _toMin(row[colSai]) : null;
            // Só usa o par se ambas as batidas existirem
            if (vEnt === null || vSai === null) return;
            if (entMin === null || vEnt < entMin) entMin = vEnt;
            if (saiMin === null || vSai > saiMin) saiMin = vSai;
          });

          // Sem nenhum par completo = dia sem registro válido, ignora
          if (entMin === null || saiMin === null) continue;

          // Entrada e saída idênticas = par inválido (batida duplicada), ignora
          if (entMin === saiMin) continue;

          var incompleto = false; // chegou aqui = par válido

          var calc = _calcHoras(dataISO, entMin, saiMin);

          rows.push({
            nome:       nome,
            data:       dataISO,
            entrada:    _min2hhmm(entMin),
            saida:      _min2hhmm(saiMin),
            horas:      calc.horas,
            extra:      calc.extra,
            atraso:     calc.atraso,
            incompleto: false,
            obs:        ''
          });
        }
      });
    });

    return rows;
  }

  // ── Parser genérico (fallback para outros formatos) ──────────
  function _parseGenerico(wb) {
    var rows = [];
    var targetSheet = null;
    wb.SheetNames.forEach(function(sn) {
      var snl = sn.toLowerCase();
      if (!targetSheet && (snl.indexOf('shift') !== -1 || snl.indexOf('attendance') !== -1 ||
          snl.indexOf('ponto') !== -1 || snl.indexOf('presen') !== -1)) {
        targetSheet = sn;
      }
    });
    if (!targetSheet) targetSheet = wb.SheetNames[0];

    var ws  = wb.Sheets[targetSheet];
    var raw = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null });
    if (!raw || raw.length < 2) return [];

    // Detectar cabeçalho
    var headerRow = 0;
    var cols = {};
    for (var r = 0; r < Math.min(raw.length, 10); r++) {
      var rowStr = (raw[r]||[]).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (/nome|name|funcionario/.test(rowStr)) { headerRow = r; break; }
    }
    (raw[headerRow]||[]).forEach(function(h,i) {
      var hn = String(h||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'');
      if      (/\bnome\b|\bname\b|\bfuncion/.test(hn)) cols.nome    = i;
      else if (/\bdata\b|\bdate\b/.test(hn))           cols.data    = i;
      else if (/entrada|check.?in/.test(hn))           cols.entrada = i;
      else if (/saida|check.?out/.test(hn))            cols.saida   = i;
    });
    if (cols.nome === undefined) { cols.nome=0; cols.data=1; cols.entrada=2; cols.saida=3; }

    for (var dr = headerRow+1; dr < raw.length; dr++) {
      var row = raw[dr];
      var nome = String(row[cols.nome]||'').trim();
      if (!nome || nome.length < 2) continue;
      var dataISO = _excelDateToISO(row[cols.data]);
      var entMin  = _toMin(row[cols.entrada]);
      var saiMin  = _toMin(row[cols.saida]);
      var calc    = _calcHoras(dataISO, entMin, saiMin);
      rows.push({
        nome: nome, data: dataISO,
        entrada: _min2hhmm(entMin), saida: _min2hhmm(saiMin),
        horas: calc.horas, extra: calc.extra, atraso: calc.atraso,
        incompleto: false, obs: ''
      });
    }
    return rows;
  }

  // ── Normaliza nome ────────────────────────────────────────────
  function _normNome(n) {
    return String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').trim();
  }

  // ── Auto-match ────────────────────────────────────────────────
  function _autoMatch(nomeRel) {
    var funcs = _getFuncionarios();
    var norm  = _normNome(nomeRel);
    var prim  = norm.split(' ')[0];
    var best  = null, bestScore = 0;
    Object.values(funcs).forEach(function(f) {
      var fn = _normNome(f.nome), fp = fn.split(' ')[0];
      var score = fn===norm?100 : fp===prim?60 : (fn.indexOf(prim)!==-1||norm.indexOf(fp)!==-1)?40:0;
      if (score > bestScore) { bestScore=score; best=f.id; }
    });
    return bestScore >= 40 ? best : '';
  }

  // ── STEP 1 ────────────────────────────────────────────────────
  function _buildStep1Html() {
    return '<div style="text-align:center;padding:24px 0;">' +
      '<div style="font-size:3rem;margin-bottom:12px;">📂</div>' +
      '<div style="font-size:.9rem;font-weight:700;color:'+T1+';margin-bottom:6px;">Selecione o Relatório de Presença</div>' +
      '<div style="font-size:.72rem;color:'+T3+';margin-bottom:20px;line-height:1.6;">' +
        'Arquivo .xls ou .xlsx do sistema biométrico' +
      '</div>' +
      '<label style="display:block;border:2px dashed '+GOLDB+';border-radius:14px;' +
        'padding:28px 20px;cursor:pointer;background:'+GOLD2+';margin-bottom:16px;">' +
        '<input type="file" id="hrImportFile" accept=".xls,.xlsx,.csv" ' +
          'style="display:none;" onchange="HR_IMPORT._onFile(this)">' +
        '<div style="font-size:1.8rem;margin-bottom:8px;">📊</div>' +
        '<div style="font-size:.82rem;color:'+GOLD+';font-weight:700;">Toque para escolher arquivo</div>' +
        '<div style="font-size:.68rem;color:'+T3+';margin-top:4px;">.xls · .xlsx · .csv</div>' +
      '</label>' +
      '<div style="background:rgba(92,142,200,.06);border:1px solid rgba(92,142,200,.2);' +
        'border-radius:10px;padding:12px 14px;text-align:left;margin-bottom:16px;">' +
        '<div style="font-size:.68rem;font-weight:700;color:'+BLUE+';margin-bottom:6px;">ℹ Regras de cálculo</div>' +
        '<div style="font-size:.67rem;color:'+T3+';line-height:1.8;">' +
          '⏱ Entrada = 1ª batida do dia · Saída = última batida<br>' +
          '📅 Seg–Sex: meta <strong style="color:'+T1+';">8h00</strong> · ' +
          'Sáb: meta <strong style="color:'+T1+';">4h00</strong> · ' +
          'Dom: meta <strong style="color:'+T1+';">0h</strong><br>' +
          '⚡ Extra = trabalhado − meta (precisão ao minuto)' +
        '</div>' +
      '</div>' +
      '<button onclick="HR_IMPORT._fechar()" style="'+CSS_BTN_GHOST+'">Cancelar</button>' +
    '</div>';
  }

  // ── STEP 2: Preview + vinculação ─────────────────────────────
  function _buildStep2Html() {
    var dados    = _parsedData;
    var funcs    = _getFuncionarios();
    var funcList = Object.values(funcs);

    var porNome = {};
    dados.forEach(function(r) {
      if (!porNome[r.nome]) porNome[r.nome] = { nome:r.nome, dias:0, horas:0, extra:0, atraso:0, incompletos:0, datas:[] };
      porNome[r.nome].dias++;
      porNome[r.nome].horas  += r.horas;
      porNome[r.nome].extra  += r.extra;
      porNome[r.nome].atraso += r.atraso;
      if (r.incompleto) porNome[r.nome].incompletos++;
      if (r.data) porNome[r.nome].datas.push(r.data);
    });

    var nomes = Object.keys(porNome);
    if (nomes.length === 0) {
      return '<div style="text-align:center;padding:32px;color:'+RED+';">⚠ Nenhum dado encontrado.<br><br>' +
        '<button onclick="HR_IMPORT._fechar()" style="'+CSS_BTN_GHOST+'">Fechar</button></div>';
    }

    var todasDatas = dados.filter(function(r){ return r.data; }).map(function(r){ return r.data; }).sort();
    var periodo = todasDatas.length > 0
      ? _fmtData(todasDatas[0]) + ' → ' + _fmtData(todasDatas[todasDatas.length-1])
      : dados.length + ' registros';

    var funcOpts = '<option value="">— Não importar —</option>' +
      funcList.map(function(f){ return '<option value="'+_esc(f.id)+'">'+_esc(f.nome)+'</option>'; }).join('');

    var DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    var rows = nomes.map(function(nome) {
      var g = porNome[nome];
      var matchId = _matchMap[nome] !== undefined ? _matchMap[nome] : _autoMatch(nome);
      _matchMap[nome] = matchId;

      var diasDados = dados.filter(function(r){ return r.nome===nome; })
        .sort(function(a,b){ return (a.data||'').localeCompare(b.data||''); });

      var diasHtml = diasDados.map(function(d) {
        var dowLabel = '';
        if (d.data) {
          var p = d.data.split('-');
          dowLabel = DIAS_PT[new Date(Date.UTC(+p[0],+p[1]-1,+p[2])).getUTCDay()];
        }
        var extraMin = Math.round(d.extra * 60);
        var atMin    = Math.round(d.atraso * 60);
        var extH = Math.floor(extraMin/60), extM = extraMin%60;
        var atH  = Math.floor(atMin/60),  atM  = atMin%60;
        var extraTxt, extraCor;
        if (d.incompleto) {
          extraTxt = '⚠ incompleto'; extraCor = T3;
        } else if (d.extra > 0) {
          extraTxt = '⚡ +'+(extH?extH+'h':'')+(extM?extM+'min':''); extraCor = GOLD;
        } else if (d.atraso > 0) {
          extraTxt = '⚠ -'+(atH?atH+'h':'')+(atM?atM+'min':''); extraCor = RED;
        } else {
          extraTxt = '✓ exato'; extraCor = GREEN;
        }
        return '<div style="display:flex;justify-content:space-between;align-items:center;' +
          'padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.63rem;">' +
          '<span style="color:'+T3+';min-width:28px;">'+dowLabel+'</span>' +
          '<span style="color:'+T2+';min-width:68px;">'+_fmtData(d.data)+'</span>' +
          '<span style="color:'+T2+';font-variant-numeric:tabular-nums;">'+(d.entrada||'--:--')+'→'+(d.saida||'--:--')+'</span>' +
          '<span style="color:'+T2+';min-width:36px;text-align:right;">'+d.horas.toFixed(2)+'h</span>' +
          '<span style="color:'+extraCor+';font-weight:700;min-width:80px;text-align:right;">'+extraTxt+'</span>' +
        '</div>';
      }).join('');

      var totalExtraMin = Math.round(g.extra*60);
      var teH = Math.floor(totalExtraMin/60), teM = totalExtraMin%60;
      var totalExtraStr = teH+'h'+(teM?teM+'min':'');

      return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px 14px;margin-bottom:9px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
          '<span data-match-nome="'+_esc(nome)+'" style="font-size:.8rem;color:'+(matchId?GREEN:T3)+';">'+(matchId?'✓':'?')+'</span>' +
          '<div style="flex:1;">' +
            '<div style="font-size:.85rem;font-weight:700;color:'+T1+';">'+_esc(nome)+'</div>' +
            '<div style="font-size:.67rem;color:'+T3+';">' +
              g.dias+' dia(s) · '+g.horas.toFixed(2)+'h trabalhadas · ' +
              '<span style="color:'+(g.extra>0?GOLD:T3)+';">⚡ +'+ totalExtraStr+' extras</span>' +
              (g.atraso>0?' · <span style="color:'+RED+';">⚠ '+(Math.floor(g.atraso))+'h'+Math.round((g.atraso%1)*60)+'min atraso/falta</span>':'') +
              (g.incompletos>0?' · <span style="color:'+T3+';">'+g.incompletos+' incompleto(s)</span>':'') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<details style="margin-bottom:8px;">' +
          '<summary style="font-size:.64rem;color:'+BLUE+';cursor:pointer;padding:4px 0;list-style:none;">' +
            '▶ Ver detalhe por dia ('+diasDados.length+' registros)' +
          '</summary>' +
          '<div style="margin-top:6px;padding:6px 8px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.05);">' +
            '<div style="display:flex;justify-content:space-between;font-size:.58rem;color:'+T3+';' +
              'padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:2px;">' +
              '<span>Dia</span><span style="min-width:68px;">Data</span><span>Entrada→Saída</span><span>Total</span><span style="min-width:80px;text-align:right;">Extra/Falta</span>' +
            '</div>' + diasHtml +
          '</div>' +
        '</details>' +
        '<select onchange="HR_IMPORT._setMatch(\''+_esc(nome)+'\',this.value)" ' +
          'style="width:100%;padding:9px 11px;border-radius:9px;border:1px solid '+BD+';' +
          'background:#0f0e0c;color:'+T1+';font-family:Outfit,sans-serif;font-size:.8rem;">' +
          funcOpts.replace('value="'+_esc(matchId)+'"','value="'+_esc(matchId)+'" selected') +
        '</select>' +
      '</div>';
    }).join('');

    return '<div>' +
      '<div style="background:rgba(92,142,200,.06);border:1px solid rgba(92,142,200,.2);border-radius:11px;padding:12px 14px;margin-bottom:16px;display:flex;gap:14px;">' +
        '<div style="flex:1;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:'+BLUE+';">'+dados.length+'</div><div style="font-size:.6rem;color:'+T3+';">registros</div></div>' +
        '<div style="flex:1;text-align:center;"><div style="font-size:1.1rem;font-weight:800;color:'+GOLD+';">'+nomes.length+'</div><div style="font-size:.6rem;color:'+T3+';">funcionários</div></div>' +
        '<div style="flex:2;text-align:center;"><div style="font-size:.78rem;font-weight:700;color:'+T2+';">'+periodo+'</div><div style="font-size:.6rem;color:'+T3+';">período</div></div>' +
      '</div>' +
      '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px;">Vincule cada nome ao funcionário correto</div>' +
      rows +
      '<div style="margin-top:4px;">' +
        '<button onclick="HR_IMPORT._confirmar()" style="'+CSS_BTN_GOLD+'">✅ Importar registros</button>' +
        '<button onclick="HR_IMPORT._fechar()" style="'+CSS_BTN_GHOST+'">Cancelar</button>' +
      '</div>' +
    '</div>';
  }

  // ── Handlers ─────────────────────────────────────────────────
  function _onFile(input) {
    var file = input.files[0];
    if (!file) return;
    _setContent('<div style="text-align:center;padding:40px;"><div style="font-size:2rem;margin-bottom:12px;">⏳</div>' +
      '<div style="font-size:.82rem;color:'+T3+';">Lendo relatório…</div></div>');
    _loadXLSX(function() {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = new Uint8Array(e.target.result);
          var wb   = XLSX.read(data, { type:'array', raw:false, cellDates:false });
          _parsedData = _parseWorkbook(wb);
          _matchMap   = {};
          _setContent(_buildStep2Html());
        } catch(err) {
          _setContent('<div style="text-align:center;padding:32px;color:'+RED+';">❌ Erro ao ler:<br><br>' +
            '<code style="font-size:.72rem;color:'+T3+';">'+_esc(err.message)+'</code><br><br>' +
            '<button onclick="HR_IMPORT._fechar()" style="'+CSS_BTN_GHOST+'">Fechar</button></div>');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function _setMatch(nome, funcId) {
    _matchMap[nome] = funcId;
    var icon = document.querySelector('[data-match-nome="'+CSS.escape(nome)+'"]');
    if (icon) { icon.textContent = funcId?'✓':'?'; icon.style.color = funcId?GREEN:T3; }
  }

  function _confirmar() {
    if (!_parsedData) return;
    var regs = _getRegistros();
    var criados=0, pulados=0, semVinculo=0;

    _parsedData.forEach(function(r) {
      var funcId = _matchMap[r.nome];
      if (!funcId) { semVinculo++; return; }
      var jaExiste = Object.values(regs).some(function(e){ return e.funcionarioId===funcId && e.data===r.data; });
      if (jaExiste) { pulados++; return; }

      var id = _genId();
      var atrasoMin = Math.round(r.atraso*60);
      var aH = Math.floor(atrasoMin/60), aM = atrasoMin%60;

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
        ieo:           r.atraso > 0 ? 'Falta/Atraso: '+(aH?aH+'h':'')+(aM?aM+'min':'') : '',
        observacao:    (r.incompleto?'⚠ Registro incompleto · ':'')+'Importado · '+(r.obs||'').slice(0,60)
      };
      criados++;
    });

    _saveRegistros(regs);
    _setContent(
      '<div style="text-align:center;padding:24px 0;">' +
        '<div style="font-size:3rem;margin-bottom:12px;">'+(criados>0?'✅':'⚠️')+'</div>' +
        '<div style="font-size:1rem;font-weight:800;color:'+T1+';margin-bottom:16px;">Importação '+(criados>0?'concluída':'sem novidades')+'</div>' +
        '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:14px 18px;margin-bottom:16px;text-align:left;">' +
          _rRow('✅','Registros criados',criados,GREEN) +
          _rRow('⏭','Já existiam (pulados)',pulados,T3) +
          _rRow('⚠','Sem vínculo (ignorados)',semVinculo,RED) +
        '</div>' +
        '<button onclick="HR_IMPORT._fechar();if(typeof HR_FUNC!==\'undefined\')HR_FUNC.renderPaginaFuncionarios();" style="'+CSS_BTN_GOLD+'">Concluir</button>' +
      '</div>'
    );
  }

  function _rRow(ico,label,val,cor) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid '+BD+';">' +
      '<div style="font-size:.8rem;color:'+T2+';">'+ico+' '+label+'</div>' +
      '<div style="font-size:.9rem;font-weight:800;color:'+cor+';">'+val+'</div></div>';
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
            '<div style="font-size:.55rem;color:'+GOLD+';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
            '<div style="font-size:1.3rem;font-weight:800;color:'+T1+';letter-spacing:-.02em;">📥 Importar Relatório</div>' +
            '<div style="font-size:.72rem;color:'+T3+';margin-top:3px;">Cálculo ao minuto · 8h/dia · 4h/sáb</div>' +
          '</div>' +
          '<button onclick="HR_IMPORT._fechar()" style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
        '</div>' +
        '<div id="hrImportBody"></div>' +
      '</div>';
    document.body.appendChild(ov);
    document.getElementById('hrImportBody').innerHTML = _buildStep1Html();
  }

  function _fechar() {
    var e = document.getElementById('hrImportOverlay');
    if (e) e.remove();
    _parsedData = null; _matchMap = {};
  }

  return {
    abrirImportacao: abrirImportacao,
    _fechar:   _fechar,
    _onFile:   _onFile,
    _setMatch: _setMatch,
    _confirmar: _confirmar
  };
})();
