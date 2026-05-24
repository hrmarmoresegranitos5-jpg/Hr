// ══════════════════════════════════════════════════════════════
// HORAS EXTRAS PDF v1 — Relatório individual por funcionário
// Lê RelatórioPresença (.xls/.xlsx via SheetJS), gera PDF A4
// Padrão: html2canvas → jsPDF (igual ao app-contrato-pdf.js)
// ══════════════════════════════════════════════════════════════

// ── Tabela de valores de hora extra por funcionário (R$/hora) ──
var HORAS_EXTRAS_VALOR = {
  'hugo':     1900,
  'hangel':   1900, // hugo == hangel no relatório (ID 1 = hugo, ID 5 = hugo — ver mapeamento abaixo)
  'fabricio': 1600,
  'gibs':     1200, // gibson
  'gibson':   1200,
  'lucas':    800,
  'tiago':    400,
};

// Mapeamento nome do relatório → nome exibido no PDF
var NOME_EXIBIDO = {
  'hangel':   'Hugo',
  'hugo':     'Hugo',
  'gibs':     'Gibson',
  'gibson':   'Gibson',
  'fabricio': 'Fabrício',
  'tiago':    'Tiago',
  'lucas':    'Lucas',
};

// ── Carrega bibliotecas (mesma lógica do contrato) ──
function _loadHEPDFLibs(cb) {
  var needSheetJS = typeof XLSX === 'undefined';
  var needH2C    = typeof html2canvas === 'undefined';
  var needJsPDF  = typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF;

  function tryDone() {
    if (typeof XLSX !== 'undefined' &&
        typeof html2canvas !== 'undefined' &&
        typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
      cb();
    }
  }

  if (needSheetJS) {
    var sx = document.createElement('script');
    sx.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    sx.onload = function () { tryDone(); };
    sx.onerror = function () { if (typeof toast === 'function') toast('Erro ao carregar SheetJS'); };
    document.head.appendChild(sx);
  }

  if (needH2C) {
    var h = document.createElement('script');
    h.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    h.onload = function () {
      if (needJsPDF) {
        var j = document.createElement('script');
        j.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        j.onload = function () { tryDone(); };
        j.onerror = function () { if (typeof toast === 'function') toast('Erro ao carregar jsPDF'); };
        document.head.appendChild(j);
      } else {
        tryDone();
      }
    };
    h.onerror = function () { if (typeof toast === 'function') toast('Erro ao carregar html2canvas'); };
    document.head.appendChild(h);
  } else if (needJsPDF) {
    var j2 = document.createElement('script');
    j2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    j2.onload = function () { tryDone(); };
    j2.onerror = function () { if (typeof toast === 'function') toast('Erro ao carregar jsPDF'); };
    document.head.appendChild(j2);
  }

  if (!needSheetJS && !needH2C && !needJsPDF) cb();
}

// ══════════════════════════════════════════════════════════════
// PONTO DE ENTRADA — chamado pelo botão na UI
// ══════════════════════════════════════════════════════════════
function abrirRelatorioHorasExtras() {
  // Cria input de arquivo invisível e dispara o seletor
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.xls,.xlsx';
  inp.style.display = 'none';
  inp.onchange = function () {
    var file = inp.files[0];
    if (!file) return;
    _processarRelatorioHE(file);
  };
  document.body.appendChild(inp);
  inp.click();
  setTimeout(function () { document.body.removeChild(inp); }, 5000);
}

// ── Lê o arquivo XLS/XLSX e extrai dados de horas extras ──
function _processarRelatorioHE(file) {
  if (typeof toast === 'function') toast('Lendo relatório...');

  _loadHEPDFLibs(function () {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data   = new Uint8Array(e.target.result);
        var wb     = XLSX.read(data, { type: 'array', cellDates: true });
        var dados  = _extrairDadosHE(wb);
        if (!dados || !dados.length) {
          if (typeof toast === 'function') toast('Nenhum funcionário encontrado no relatório.');
          return;
        }
        _abrirOverlaySelecaoFuncionario(dados, file.name);
      } catch (err) {
        console.error('[HorasExtrasPDF]', err);
        if (typeof toast === 'function') toast('Erro ao ler arquivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Extrai dados da aba "Tabela de estatísticas de prese" ──
function _extrairDadosHE(wb) {
  // Tenta achar a aba de estatísticas
  var sheetName = wb.SheetNames.find(function (n) {
    return n.toLowerCase().indexOf('estat') >= 0 || n.toLowerCase().indexOf('prese') >= 0;
  }) || wb.SheetNames[1] || wb.SheetNames[0];

  var ws   = wb.Sheets[sheetName];
  var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

  // Encontra linha de cabeçalho (contém 'IDUsuário' ou 'Nome')
  var headerIdx = -1;
  rows.forEach(function (r, i) {
    if (r && r.some(function (c) { return c && String(c).toLowerCase().indexOf('nome') >= 0; })) {
      if (headerIdx < 0) headerIdx = i;
    }
  });
  if (headerIdx < 0) headerIdx = 2; // fallback

  // Mapeia colunas pelo cabeçalho principal (linha headerIdx)
  var h      = rows[headerIdx] || [];
  var hSub   = rows[headerIdx + 1] || []; // linha de sub-cabeçalho (normal/feriado)

  var colId        = h.indexOf('IDUsuário');
  var colNome      = h.indexOf('Nome');
  var colDep       = h.indexOf('Dep.');
  var colHtNormal  = -1;
  var colHtHol     = -1;
  var colAusencia  = -1;
  var colDiasSem   = -1;

  // Procura colunas de Horas extras: encontra 'Horas extras(hrs.)' e pega sub-colunas
  h.forEach(function (v, i) {
    if (!v) return;
    var s = String(v).toLowerCase();
    if (s.indexOf('horas extras') >= 0) {
      // sub-coluna normal = i, feriado = i+2 (com base no padrão do relatório)
      if (colHtNormal < 0) {
        colHtNormal = i;
        colHtHol    = i + 2;
      }
    }
    if (s.indexOf('ausência') >= 0 && colAusencia < 0) colAusencia = i;
    if (s.indexOf('semana') >= 0 && colDiasSem < 0) colDiasSem = i;
  });

  // Dados reais começam 2 linhas após o cabeçalho
  var dataStart = headerIdx + 2;
  var funcionarios = [];

  for (var i = dataStart; i < rows.length; i++) {
    var r = rows[i];
    if (!r || !r[colNome]) continue;

    var nomeRaw  = String(r[colNome]).trim().toLowerCase();
    var nomeExib = NOME_EXIBIDO[nomeRaw] || (r[colNome] ? String(r[colNome]) : '');
    var valorHora = HORAS_EXTRAS_VALOR[nomeRaw] || 0;

    var horasNorm = parseFloat(r[colHtNormal]) || 0;
    var horasHol  = colHtHol >= 0 ? (parseFloat(r[colHtHol]) || 0) : 0;
    var totalHoras = horasNorm + horasHol;

    // Dias trabalhados (parse "16/15" → normal/real)
    var diasStr   = colDiasSem >= 0 ? String(r[colDiasSem] || '') : '';
    var diasParts = diasStr.split('/');
    var diasNorm  = parseInt(diasParts[0]) || 0;
    var diasReal  = parseInt(diasParts[1]) || 0;

    var ausencia  = colAusencia >= 0 ? (parseFloat(r[colAusencia]) || 0) : 0;

    var totalPagar = totalHoras * valorHora;

    funcionarios.push({
      id:         r[colId]   || (i - dataStart + 1),
      nomeRaw:    nomeRaw,
      nome:       nomeExib,
      dep:        r[colDep]  || 'marmoraria',
      horasNorm:  horasNorm,
      horasHol:   horasHol,
      totalHoras: totalHoras,
      diasNorm:   diasNorm,
      diasReal:   diasReal,
      ausencia:   ausencia,
      valorHora:  valorHora,
      totalPagar: totalPagar,
    });
  }

  return funcionarios;
}

// ══════════════════════════════════════════════════════════════
// OVERLAY DE SELEÇÃO — lista funcionários, gera PDF individual
// ══════════════════════════════════════════════════════════════
function _abrirOverlaySelecaoFuncionario(dados, nomeArquivo) {
  // Remove overlay anterior se existir
  var antigo = document.getElementById('heOverlay');
  if (antigo) antigo.remove();

  var ov = document.createElement('div');
  ov.id = 'heOverlay';
  ov.style.cssText = [
    'position:fixed;inset:0;z-index:99999;background:rgba(10,8,0,.92);',
    'display:flex;flex-direction:column;align-items:center;',
    'font-family:Outfit,sans-serif;overflow-y:auto;padding:20px 0 40px;',
  ].join('');

  // ── Cabeçalho do overlay ──
  var header = '<div style="width:100%;max-width:700px;padding:0 16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
      '<div>' +
        '<div style="font-size:.7rem;color:#C9A84C;letter-spacing:.12em;text-transform:uppercase;">Horas Extras</div>' +
        '<div style="font-size:1.15rem;font-weight:700;color:#f5f0e0;margin-top:2px;">Relatório de Pagamento</div>' +
        '<div style="font-size:.72rem;color:#888;margin-top:3px;">' + nomeArquivo + '</div>' +
      '</div>' +
      '<button id="hePdfClose" style="background:none;border:1px solid rgba(201,168,76,.3);color:#C9A84C;' +
        'border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;">✕ Fechar</button>' +
    '</div>';

  // ── Tabela resumo ──
  var totalGeral = dados.reduce(function (s, f) { return s + f.totalPagar; }, 0);

  var tBody = '';
  dados.forEach(function (f) {
    var temHE = f.totalHoras > 0;
    tBody += '<tr style="border-bottom:1px solid rgba(201,168,76,.12);' +
      (temHE ? '' : 'opacity:.5;') + '">' +
      '<td style="padding:10px 8px;color:#f0e8d0;font-weight:600;">' + f.nome + '</td>' +
      '<td style="padding:10px 8px;color:#aaa;font-size:.85rem;">' + f.dep + '</td>' +
      '<td style="padding:10px 8px;color:#C9A84C;text-align:center;">' + _fmH(f.totalHoras) + 'h</td>' +
      '<td style="padding:10px 8px;color:#888;text-align:center;font-size:.82rem;">R$ ' + _fmV(f.valorHora) + '/h</td>' +
      '<td style="padding:10px 8px;color:#f0e8d0;font-weight:700;text-align:right;">R$ ' + _fmV(f.totalPagar) + '</td>' +
      '<td style="padding:10px 8px;text-align:center;">' +
        '<button onclick="gerarHorasExtrasPDF(' + JSON.stringify(f) + ')" ' +
          'style="background:#1e1800;border:1px solid rgba(201,168,76,.5);color:#C9A84C;' +
          'border-radius:5px;padding:5px 12px;cursor:pointer;font-size:.78rem;font-family:Outfit,sans-serif;">' +
          '📄 PDF</button>' +
      '</td>' +
    '</tr>';
  });

  var tabela = '<div style="background:#141008;border:1px solid rgba(201,168,76,.2);border-radius:10px;overflow:hidden;">' +
    '<table style="width:100%;border-collapse:collapse;">' +
      '<thead><tr style="background:rgba(201,168,76,.08);">' +
        '<th style="padding:10px 8px;text-align:left;color:#C9A84C;font-size:.78rem;font-weight:600;">Funcionário</th>' +
        '<th style="padding:10px 8px;text-align:left;color:#C9A84C;font-size:.78rem;font-weight:600;">Setor</th>' +
        '<th style="padding:10px 8px;text-align:center;color:#C9A84C;font-size:.78rem;font-weight:600;">H. Extras</th>' +
        '<th style="padding:10px 8px;text-align:center;color:#C9A84C;font-size:.78rem;font-weight:600;">Valor/h</th>' +
        '<th style="padding:10px 8px;text-align:right;color:#C9A84C;font-size:.78rem;font-weight:600;">Total</th>' +
        '<th style="padding:10px 8px;text-align:center;color:#C9A84C;font-size:.78rem;font-weight:600;">Ação</th>' +
      '</tr></thead>' +
      '<tbody>' + tBody + '</tbody>' +
    '</table>' +
  '</div>';

  var totalBox = '<div style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);' +
    'border-radius:8px;padding:14px 18px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;">' +
    '<span style="color:#aaa;font-size:.88rem;">Total geral a pagar em horas extras</span>' +
    '<span style="color:#C9A84C;font-weight:700;font-size:1.1rem;">R$ ' + _fmV(totalGeral) + '</span>' +
  '</div>';

  var gerarTodosBtn = '<div style="text-align:center;margin-top:18px;">' +
    '<button onclick="gerarTodosHorasExtrasPDF(' + JSON.stringify(dados) + ')" ' +
      'style="background:#1e1800;border:1px solid rgba(201,168,76,.6);color:#C9A84C;' +
      'border-radius:8px;padding:10px 28px;cursor:pointer;font-size:.88rem;font-family:Outfit,sans-serif;font-weight:600;">' +
      '📄 Gerar PDFs de Todos os Funcionários</button>' +
  '</div>';

  ov.innerHTML = header + tabela + totalBox + gerarTodosBtn + '</div>';
  document.body.appendChild(ov);

  document.getElementById('hePdfClose').onclick = function () { ov.remove(); };
}

// ── Helpers de formatação ──
function _fmV(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function _fmH(h) {
  return parseFloat(h || 0).toFixed(2).replace('.', ',');
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO DO PDF INDIVIDUAL
// ══════════════════════════════════════════════════════════════
function gerarHorasExtrasPDF(f) {
  if (typeof f === 'string') f = JSON.parse(f);
  _loadHEPDFLibs(function () {
    try {
      _buildHEPDF(f);
    } catch (e) {
      console.error('[HorasExtrasPDF]', e);
      if (typeof toast === 'function') toast('Erro PDF: ' + e.message);
    }
  });
}

function gerarTodosHorasExtrasPDF(lista) {
  if (typeof lista === 'string') lista = JSON.parse(lista);
  if (typeof toast === 'function') toast('Gerando ' + lista.length + ' PDFs...');
  var idx = 0;
  function next() {
    if (idx >= lista.length) {
      if (typeof toast === 'function') toast('✓ Todos os PDFs gerados!');
      return;
    }
    gerarHorasExtrasPDF(lista[idx]);
    idx++;
    setTimeout(next, 1800);
  }
  next();
}

function _buildHEPDF(f) {
  var emp = (typeof CFG !== 'undefined' && CFG && CFG.emp)
    ? CFG.emp
    : { nome: 'Marmoraria', cnpj: '', end: '', cidade: '', tel: '' };

  var hoje     = new Date();
  var dataStr  = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  var fileName = 'HorasExtras_' + f.nome.replace(/[^a-zA-Z0-9]/g, '_') + '_' + hoje.toLocaleDateString('pt-BR').replace(/\//g, '-') + '.pdf';

  // ── Monta o HTML do recibo ──
  var temHE   = f.totalHoras > 0;
  var statusTxt = temHE
    ? '<span style="background:#1a3a1a;border:1px solid #4a8a4a;color:#6dc86d;border-radius:4px;padding:2px 10px;font-size:.75rem;">✓ Horas Extras Registradas</span>'
    : '<span style="background:#3a1a1a;border:1px solid #8a4a4a;color:#c86d6d;border-radius:4px;padding:2px 10px;font-size:.75rem;">Sem Horas Extras no Período</span>';

  var recHtml = '<div id="hePDFReceipt" style="' +
    'background:#fff;width:794px;min-height:1000px;padding:52px 56px;' +
    'box-sizing:border-box;font-family:Outfit,Helvetica,sans-serif;color:#1a1a1a;">' +

    // Topo: logo + empresa
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">' +
      '<div>' +
        '<div style="font-size:22px;font-weight:800;color:#1a1200;letter-spacing:-.3px;">' + (emp.nome || 'Marmoraria') + '</div>' +
        (emp.cnpj ? '<div style="font-size:11px;color:#666;margin-top:2px;">CNPJ: ' + emp.cnpj + '</div>' : '') +
        (emp.end  ? '<div style="font-size:11px;color:#666;">' + emp.end + (emp.cidade ? ' — ' + emp.cidade : '') + '</div>' : '') +
        (emp.tel  ? '<div style="font-size:11px;color:#666;">' + emp.tel + '</div>' : '') +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="font-size:11px;color:#888;">Emitido em</div>' +
        '<div style="font-size:12px;font-weight:600;color:#333;">' + dataStr + '</div>' +
        '<div style="margin-top:6px;">' + statusTxt + '</div>' +
      '</div>' +
    '</div>' +

    // Linha divisória dourada
    '<div style="height:3px;background:linear-gradient(90deg,#C9A84C,#e8c96a,#C9A84C);border-radius:2px;margin-bottom:28px;"></div>' +

    // Título
    '<div style="text-align:center;margin-bottom:28px;">' +
      '<div style="font-size:18px;font-weight:800;color:#1a1200;letter-spacing:.04em;text-transform:uppercase;">Comprovante de Horas Extras</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px;">Período de apuração: 01/05/2026 – 23/05/2026</div>' +
    '</div>' +

    // Card do funcionário
    '<div style="background:#faf7f0;border:1px solid #e8dfc8;border-radius:10px;padding:20px 24px;margin-bottom:24px;">' +
      '<div style="font-size:10px;font-weight:700;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Dados do Funcionário</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
        _cardCampo('Nome Completo', f.nome) +
        _cardCampo('Departamento', (f.dep || 'Marmoraria').charAt(0).toUpperCase() + (f.dep || 'marmoraria').slice(1)) +
        _cardCampo('ID', String(f.id).padStart(3, '0')) +
      '</div>' +
    '</div>' +

    // Card de presença
    '<div style="background:#faf7f0;border:1px solid #e8dfc8;border-radius:10px;padding:20px 24px;margin-bottom:24px;">' +
      '<div style="font-size:10px;font-weight:700;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Resumo de Presença</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
        _cardCampo('Dias Úteis (referência)', String(f.diasNorm) + ' dias') +
        _cardCampo('Dias Trabalhados', String(f.diasReal) + ' dias') +
        _cardCampo('Faltas', String(f.ausencia) + (f.ausencia === 1 ? ' dia' : ' dias')) +
      '</div>' +
    '</div>' +

    // Card de horas extras
    '<div style="background:#1e1800;border:2px solid #C9A84C;border-radius:10px;padding:22px 24px;margin-bottom:24px;">' +
      '<div style="font-size:10px;font-weight:700;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:14px;">Apuração de Horas Extras</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">' +
        _cardCampoEscuro('H. Extras em Dias Normais', _fmH(f.horasNorm) + ' h') +
        _cardCampoEscuro('H. Extras em Feriados', _fmH(f.horasHol) + ' h') +
      '</div>' +
      '<div style="height:1px;background:rgba(201,168,76,.3);margin-bottom:16px;"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div>' +
          '<div style="color:#aaa;font-size:.75rem;">Total de Horas Extras</div>' +
          '<div style="color:#C9A84C;font-size:1.4rem;font-weight:800;">' + _fmH(f.totalHoras) + ' h</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<div style="color:#aaa;font-size:.75rem;">Valor por Hora</div>' +
          '<div style="color:#f5f0e0;font-size:1rem;font-weight:700;">R$ ' + _fmV(f.valorHora) + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="color:#aaa;font-size:.75rem;">Total a Receber</div>' +
          '<div style="color:#C9A84C;font-size:1.6rem;font-weight:800;">R$ ' + _fmV(f.totalPagar) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Nota / observação
    (f.totalHoras === 0
      ? '<div style="background:#fff8f0;border-left:3px solid #C9A84C;padding:12px 16px;border-radius:0 6px 6px 0;font-size:11px;color:#665500;margin-bottom:24px;">Nenhuma hora extra registrada para este funcionário no período apurado. O valor de horas extras devidas é R$ 0,00.</div>'
      : ''
    ) +

    // Cálculo detalhado
    '<div style="background:#f9f5ef;border:1px solid #e8dfc8;border-radius:10px;padding:18px 22px;margin-bottom:28px;">' +
      '<div style="font-size:10px;font-weight:700;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Memória de Cálculo</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
        '<tr><td style="padding:5px 0;color:#555;">Horas extras normais</td><td style="text-align:right;color:#333;">' + _fmH(f.horasNorm) + ' h × R$ ' + _fmV(f.valorHora) + '</td><td style="text-align:right;font-weight:600;color:#333;padding-left:16px;">R$ ' + _fmV(f.horasNorm * f.valorHora) + '</td></tr>' +
        '<tr><td style="padding:5px 0;color:#555;">Horas extras em feriados</td><td style="text-align:right;color:#333;">' + _fmH(f.horasHol) + ' h × R$ ' + _fmV(f.valorHora) + '</td><td style="text-align:right;font-weight:600;color:#333;padding-left:16px;">R$ ' + _fmV(f.horasHol * f.valorHora) + '</td></tr>' +
        '<tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 0;font-weight:700;color:#1a1200;" colspan="2">Total a pagar</td><td style="padding:8px 0 0;text-align:right;font-weight:800;font-size:14px;color:#C9A84C;padding-left:16px;">R$ ' + _fmV(f.totalPagar) + '</td></tr>' +
      '</table>' +
    '</div>' +

    // Assinaturas
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:32px;">' +
      '<div style="text-align:center;">' +
        '<div style="border-top:1px solid #bbb;padding-top:8px;font-size:11px;color:#555;">' + (emp.nome || 'Empresa') + '</div>' +
        '<div style="font-size:10px;color:#999;margin-top:2px;">Responsável / Gerência</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="border-top:1px solid #bbb;padding-top:8px;font-size:11px;color:#555;">' + f.nome + '</div>' +
        '<div style="font-size:10px;color:#999;margin-top:2px;">Funcionário</div>' +
      '</div>' +
    '</div>' +

    // Rodapé
    '<div style="margin-top:36px;text-align:center;font-size:10px;color:#bbb;border-top:1px solid #eee;padding-top:14px;">' +
      'Documento gerado automaticamente • ' + dataStr + ' • ' + (emp.nome || 'Marmoraria') +
    '</div>' +

  '</div>'; // fim #hePDFReceipt

  // ── Renderiza offscreen e gera PDF ──
  var offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;pointer-events:none;z-index:-1;';
  offscreen.innerHTML = recHtml;
  document.body.appendChild(offscreen);

  // ── Cria overlay de preview (padrão do contrato) ──
  var ovPrev = document.createElement('div');
  ovPrev.id = 'hePreviewOverlay';
  ovPrev.style.cssText = [
    'position:fixed;inset:0;z-index:100000;background:rgba(10,8,0,.95);',
    'display:flex;flex-direction:column;align-items:center;overflow-y:auto;',
    'font-family:Outfit,sans-serif;padding:20px 0 40px;',
  ].join('');

  ovPrev.innerHTML =
    '<div style="width:100%;max-width:700px;padding:0 16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<div>' +
          '<div style="font-size:.7rem;color:#C9A84C;letter-spacing:.12em;">HORAS EXTRAS — ' + f.nome.toUpperCase() + '</div>' +
          '<div style="font-size:1rem;font-weight:700;color:#f5f0e0;margin-top:2px;">Preview do Comprovante</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="hePdfClose2" style="background:none;border:1px solid rgba(201,168,76,.3);color:#C9A84C;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;">✕</button>' +
          '<button id="hePdfPrint" style="background:#1e1800;border:1px solid rgba(201,168,76,.3);color:#666;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;" disabled>🖨 Imprimir</button>' +
          '<button id="hePdfDown"  style="background:#1e1800;border:1px solid rgba(201,168,76,.3);color:#666;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;" disabled>⬇ Salvar PDF</button>' +
        '</div>' +
      '</div>' +
      '<div id="hePreview" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;">' +
        '<div style="color:#aaa;font-size:.82rem;padding:60px 0;">Gerando preview...</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(ovPrev);
  document.getElementById('hePdfClose2').onclick = function () { ovPrev.remove(); if (document.body.contains(offscreen)) document.body.removeChild(offscreen); };

  var preview = document.getElementById('hePreview');

  // ── Print handler ──
  document.getElementById('hePdfPrint').onclick = function () {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { if (typeof toast === 'function') toast('Popup bloqueado — permita popups'); return; }
    var css = '<style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}</style>';
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' + css + '</head><body>' + recHtml + '<script>window.onload=function(){window.print();};<\/script></body></html>');
  };

  // ── html2canvas → jsPDF ──
  setTimeout(function () {
    html2canvas(offscreen.querySelector('#hePDFReceipt'), {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
    }).then(function (canvas) {
      document.body.removeChild(offscreen);

      var jsPDF   = window.jspdf.jsPDF;
      var pageW   = 595.28, pageH = 841.89;
      var imgW    = pageW, imgH = canvas.height * (pageW / canvas.width);
      var pxPerPg = Math.round(canvas.height / (canvas.height * (pageW / canvas.width) / pageH));
      var nEst    = Math.ceil(canvas.height / pxPerPg);

      // Corte inteligente (sem cortar texto)
      var ctxS    = canvas.getContext('2d');
      function findCut(ideal) {
        var search = Math.round(pxPerPg * 0.08);
        var from   = Math.max(0, ideal - search);
        var to     = Math.min(canvas.height - 2, ideal + Math.round(search * 0.25));
        var rows   = to - from;
        var imgD   = ctxS.getImageData(0, from, canvas.width, rows).data;
        for (var r = rows - 1; r >= 0; r--) {
          var isWhite = true;
          for (var c = 0; c < canvas.width; c++) {
            var idx = (r * canvas.width + c) * 4;
            if (imgD[idx] < 250 || imgD[idx + 1] < 250 || imgD[idx + 2] < 250) { isWhite = false; break; }
          }
          if (isWhite) return from + r;
        }
        return ideal;
      }

      var cuts = [0];
      for (var k = 1; k < nEst; k++) {
        var id = Math.round(k * pxPerPg);
        if (id < canvas.height) cuts.push(findCut(id));
      }
      cuts.push(canvas.height);
      var nPages = cuts.length - 1;

      var pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      for (var pg = 0; pg < nPages; pg++) {
        if (pg > 0) pdf.addPage();
        var y0 = cuts[pg], y1 = cuts[pg + 1], sh = y1 - y0;
        var sc = document.createElement('canvas');
        sc.width = canvas.width; sc.height = sh;
        var sc2 = sc.getContext('2d');
        sc2.fillStyle = '#ffffff';
        sc2.fillRect(0, 0, sc.width, sh);
        sc2.drawImage(canvas, 0, y0, canvas.width, sh, 0, 0, canvas.width, sh);
        pdf.addImage(sc.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, imgW, sh * (pageW / canvas.width));
      }
      var pdfBlob = pdf.output('blob');

      // Preview
      preview.innerHTML = '';
      var wrapAll = document.createElement('div');
      wrapAll.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:700px;';
      for (var pi = 0; pi < nPages; pi++) {
        var py0 = cuts[pi], py1 = cuts[pi + 1], psh = py1 - py0;
        var pc = document.createElement('canvas');
        pc.width = canvas.width; pc.height = psh;
        var pctx = pc.getContext('2d');
        pctx.fillStyle = '#ffffff'; pctx.fillRect(0, 0, pc.width, psh);
        pctx.drawImage(canvas, 0, py0, canvas.width, psh, 0, 0, canvas.width, psh);
        var pimg = document.createElement('img');
        pimg.src = pc.toDataURL('image/jpeg', 0.88);
        pimg.style.cssText = 'width:100%;display:block;box-shadow:0 4px 24px rgba(0,0,0,.7);border:1px solid rgba(201,168,76,.15);';
        wrapAll.appendChild(pimg);
      }
      preview.appendChild(wrapAll);

      function enableBtn(id, label, cb) {
        var b = document.getElementById(id); if (!b) return;
        b.innerHTML = label; b.disabled = false;
        b.style.color = '#C9A84C'; b.style.borderColor = 'rgba(201,168,76,.55)'; b.style.background = '#1e1800';
        b.onclick = cb;
      }

      enableBtn('hePdfDown', '⬇ Salvar PDF', function () {
        var url = URL.createObjectURL(pdfBlob);
        var a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        if (typeof toast === 'function') toast('PDF salvo: ' + fileName);
      });

      enableBtn('hePdfPrint', '🖨 Imprimir', function () {
        var w = window.open('', '_blank', 'width=900,height=700');
        if (!w) { if (typeof toast === 'function') toast('Popup bloqueado — permita popups'); return; }
        var css = '<style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}</style>';
        w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' + css + '</head><body>' + recHtml + '<script>window.onload=function(){window.print();};<\/script></body></html>');
      });

      if (navigator.share) {
        // Adiciona botão compartilhar se disponível
        var shareBtn = document.createElement('button');
        shareBtn.id = 'hePdfShare';
        shareBtn.style.cssText = 'background:#1e1800;border:1px solid rgba(201,168,76,.55);color:#C9A84C;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;font-family:Outfit,sans-serif;';
        shareBtn.innerHTML = '↗ Compartilhar';
        shareBtn.onclick = function () {
          var pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          var sd = { title: 'Horas Extras — ' + f.nome, text: 'Comprovante de horas extras\nTotal: R$ ' + _fmV(f.totalPagar) };
          if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) sd.files = [pdfFile];
          navigator.share(sd).catch(function () {});
        };
        var btnArea = ovPrev.querySelector('div > div > div:nth-child(2)');
        if (btnArea) btnArea.appendChild(shareBtn);
      }

      if (typeof toast === 'function') toast('✓ PDF pronto — ' + f.nome + ' (' + nPages + (nPages === 1 ? ' página' : ' páginas') + ')');
    }).catch(function (err) {
      console.error('[HorasExtrasPDF] canvas error:', err);
      if (document.body.contains(offscreen)) document.body.removeChild(offscreen);
      preview.innerHTML = '<div style="text-align:center;color:#c94444;padding:40px 20px;font-family:Outfit,sans-serif;font-size:.82rem;">Erro ao gerar preview. Use 🖨 Imprimir.</div>';
    });
  }, 200);
}

// ── Helpers para blocos de campo no PDF ──
function _cardCampo(label, valor) {
  return '<div>' +
    '<div style="font-size:10px;color:#999;margin-bottom:3px;">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:600;color:#1a1200;">' + valor + '</div>' +
  '</div>';
}
function _cardCampoEscuro(label, valor) {
  return '<div>' +
    '<div style="font-size:10px;color:#888;margin-bottom:3px;">' + label + '</div>' +
    '<div style="font-size:14px;font-weight:700;color:#C9A84C;">' + valor + '</div>' +
  '</div>';
}

console.log('[HorasExtrasPDF v1] ✓ — módulo de horas extras carregado');
