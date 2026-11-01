// ══════════════════════════════════════════════════════════════
// EXTRATO BANCÁRIO → FINANÇAS
// Importa o PDF do extrato (Banco do Brasil), a planilha XLSX (Bradesco) ou um OFX (qualquer banco),
// lê todos os lançamentos
// e pergunta UMA vez por favorecido o que ele é. A resposta fica
// guardada como regra: no mês seguinte o sistema já classifica sozinho.
//
// Não mexe em app-financas.js: só encaixa uma aba "Extrato" nas
// abas de Finanças e embrulha renderFinBody().
//
// Regras de ouro:
//  • BB Rende Fácil (aplicação automática), "Saldo do dia" → ignorados
//  • Pix pra funcionário → reconhece pelo cadastro do RH; se o RH já
//    lançou o pagamento (origem 'rh_pagamento'), NÃO duplica
//  • Devolução (Pix-Envio devolvido) com mesmo valor de um envio → os dois
//    se anulam
//  • Cada lançamento carrega _extId, então reimportar o mesmo extrato
//    (ou um que se sobreponha) nunca duplica
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var K_REGRAS = 'hr_extrato_regras';
  var K_HIST   = 'hr_extrato_hist';
  var K_CFG    = 'hr_extrato_cfg';
  var PDFJS_URL    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var SHEETJS_URL  = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  // Categorias de despesa que já existem em Finanças
  var CATS = [
    { k: 'material',    i: '🪨', n: 'Material (pedra)' },
    { k: 'insumos',     i: '🧰', n: 'Insumos' },
    { k: 'combustivel', i: '⛽', n: 'Combustível' },
    { k: 'fixo',        i: '🏠', n: 'Custo fixo' },
    { k: 'ferramentas', i: '🔧', n: 'Ferramentas' },
    { k: 'veiculo',     i: '🚗', n: 'Veículo / manutenção' },
    { k: 'outros',      i: '📦', n: 'Outros' }
  ];
  var CAT_ALIM = 'c_alimentacao_equipe';
  var K_CATS = 'hr_extrato_cats';   // categorias criadas por você ({k,i,n})
  var EMOJIS_CAT = ['🏷️', '🧾', '🍽️', '🏥', '📣', '📱', '🧹', '🛠️', '📚', '🎁'];
  // deixa a categoria conhecida no resto do app (pró-labore, resumo, modais de lançamento)
  function registrarCat(c) {
    if (c.k !== 'veiculo' && c.k.indexOf('c_') !== 0) return;   // as categorias de sempre o app já conhece
    try {
      if (typeof PL_CAT_LABEL !== 'undefined' && !PL_CAT_LABEL.hasOwnProperty(c.k)) PL_CAT_LABEL[c.k] = c.i + ' ' + c.n;
      ['fCat', 'teCat'].forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel || !sel.options) return;
        for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === c.k) return;
        var o = document.createElement('option'); o.value = c.k; o.textContent = c.i + ' ' + c.n; sel.appendChild(o);
      });
    } catch (e) {}
  }
  (function carregarCatsCustom() {
    var salvas = [];
    try { salvas = JSON.parse(localStorage.getItem(K_CATS)) || []; } catch (e) {}
    if (!salvas.some(function (c) { return c && c.k === CAT_ALIM; })) {      // comida/café/pão da equipe (não é gasto pessoal)
      salvas.push({ k: CAT_ALIM, i: '🍽️', n: 'Alimentação da equipe' });
      _gravar(K_CATS, salvas);
    }
    var outros = CATS.pop();                                    // mantém "Outros" por último
    salvas.forEach(function (c) { if (c && c.k && !CATS.some(function (x) { return x.k === c.k; })) CATS.push(c); });
    CATS.push(outros);
    CATS.forEach(registrarCat);
  })();
  function catNome(k) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].k === k) return CATS[i].i + ' ' + CATS[i].n;
    if (k === 'mao_obra') return '👷 Mão de obra';
    return k;
  }

  // ───────────────────────── utilidades ─────────────────────────
  function _ler(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function _gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error('[EXTRATO]', e); } }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  }
  function titulo(s) {
    return String(s || '').toLowerCase().replace(/(^|\s)([a-zà-ú])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function brl(v) { return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dmy(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function diasEntre(a, b) { return Math.abs((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 86400000); }
  function mesmoGrupo(a, b) {
    if (a === b) return true;
    a = String(a).replace(/ /g, ''); b = String(b).replace(/ /g, '');
    if (a === b) return true;
    var m = Math.min(a.length, b.length);
    return m >= 8 && (a.indexOf(b) === 0 || b.indexOf(a) === 0);
  }

  // Quem é "meu": só usado pra SUGERIR "transferência interna"
  // (derivado do próprio extrato: CNPJ e nome da empresa/titular).
  function lerCfg() {
    var c = _ler(K_CFG, null);
    if (!c) {
      c = { docs: ['64639182000128'], nomes: ['GILIARDE HANGEL RODRIGUES', 'GILIARDE H R SOUSA', 'HR MARMORES'] };
      _gravar(K_CFG, c);
    }
    return c;
  }
  function ehProprio(nomeNorm, docp) {
    var c = lerCfg();
    if (docp) for (var i = 0; i < c.docs.length; i++) if (docp.slice(-c.docs[i].length) === c.docs[i] && c.docs[i].length >= 11) return true;
    for (var j = 0; j < c.nomes.length; j++) {
      var cn = norm(c.nomes[j]);
      if (nomeNorm.indexOf(cn) === 0 && nomeNorm.length >= 8) return true;
      // nome cortado pelo banco: "GILIARDE HANGE" é o começo de "GILIARDE HANGEL RODRIGUES"
      if (nomeNorm.length >= 10 && nomeNorm.indexOf(' ') > 0 && cn.indexOf(nomeNorm) === 0) return true;
    }
    return false;
  }

  // ───────────────────────── PARSER DO EXTRATO BB ─────────────────────────
  // Entrada: texto do PDF na ordem do fluxo (é a ordem que o pdf.js entrega).
  // Cada lançamento começa numa data "dd/mm/aaaa" (data de contabilização);
  // a data real da operação vem no carimbo "dd/mm hh:mm" da descrição.
  var HEADER_RE = /Extrato de Conta Corrente\s+Cliente:[\s\S]*?Lan[çc]amentos\s+Dia\s+(?:Lote\s+Documento\s+Hist[óo]rico\s+Valor|Documento\s+Valor\s+Lote\s+Hist[óo]rico)/gi;
  var VALOR_RE  = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*\(([+-])\)/;

  function parseExtratoBB(texto) {
    texto = String(texto || '').replace(/\u00a0/g, ' ');
    var per = /Per[ií]odo:\s*(\d{2})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
    var periodo = per ? { mes: per[4] + '-' + per[3], de: per[4] + '-' + per[3] + '-' + per[1], ate: per[4] + '-' + per[3] + '-' + per[2] } : null;
    texto = texto.replace(HEADER_RE, ' ');

    // marcas = datas completas que iniciam um lançamento
    // (ignora "referente a 31/07/2026", que é texto da descrição)
    var re = /(\d{2})\/(\d{2})\/(\d{4})/g, m, marcas = [];
    while ((m = re.exec(texto))) {
      var antes = texto.slice(Math.max(0, m.index - 16), m.index);
      if (/referente\s*(a\s*)?$/i.test(antes)) continue;
      marcas.push({ i: m.index, fim: m.index + m[0].length, d: m[3] + '-' + m[2] + '-' + m[1] });
    }

    var recs = [], avisos = [], vistos = {};
    for (var k = 0; k < marcas.length; k++) {
      var seg = texto.slice(marcas[k].fim, k + 1 < marcas.length ? marcas[k + 1].i : texto.length).replace(/\s+/g, ' ').trim();
      var vm = VALOR_RE.exec(seg);
      if (!vm) { avisos.push('Sem valor: ' + marcas[k].d + ' ' + seg.slice(0, 40)); continue; }
      var cent = Math.round(parseFloat(vm[1].replace(/\./g, '').replace(',', '.')) * 100);
      var sinal = vm[2];
      var rest = (seg.slice(0, vm.index) + ' ' + seg.slice(vm.index + vm[0].length)).replace(/\s+/g, ' ').trim();

      // lote e documento: até 2 números no início
      var tk = rest.split(' '), nums = [];
      while (tk.length && nums.length < 2 && /^\d{3,}$/.test(tk[0])) nums.push(tk.shift());
      var hist = tk.join(' ');
      var lote = nums.length === 2 ? nums[0] : '';
      var doc = nums.length ? nums[nums.length - 1] : '';

      // carimbo da operação
      var h2 = ' ' + hist, head = hist, tail = '', dataEv = marcas[k].d;
      var sm = /\s(\d{2})\/(\d{2})\s+(\d{2}:\d{2})\s+/.exec(h2);
      if (sm) {
        head = h2.slice(0, sm.index).trim();
        tail = h2.slice(sm.index + sm[0].length).trim();
        var ano = parseInt(marcas[k].d.slice(0, 4), 10);
        var cand = ano + '-' + sm[2] + '-' + sm[1];
        if (cand > marcas[k].d) cand = (ano - 1) + '-' + sm[2] + '-' + sm[1];
        dataEv = cand;
      }

      var tipo = 'outro';
      if (/^Saldo Anterior/i.test(head)) tipo = 'saldo_ant';
      else if (/^Saldo do dia/i.test(head)) tipo = 'saldo_dia';
      else if (/^S\s*A\s*L\s*D\s*O\s*$/i.test(head)) tipo = 'saldo_fim';
      else if (/Rende F[aá]cil/i.test(head)) tipo = 'rende';
      else if (/^Pix\s*-?\s*Envio devolvido/i.test(head)) tipo = 'estorno';
      else if (/^Pix\s*-\s*Enviado/i.test(head)) tipo = 'pix_out';
      else if (/^Pix\s*-\s*Recebido/i.test(head)) tipo = 'pix_in';
      else if (/^Compra com Cart/i.test(head)) tipo = 'cartao';
      else if (/^Dep[oó]sito|^Dep dinheiro/i.test(head)) tipo = 'deposito';
      else if (/^Saque/i.test(head)) tipo = 'saque';
      else if (/^Pagamento de Boleto/i.test(head)) tipo = 'boleto';
      else if (/^Tar/i.test(head)) tipo = 'tarifa';

      var nome = '', docp = '';
      if (tipo === 'boleto') nome = head.replace(/^Pagamento de Boleto\s*/i, '').trim();
      else if (tipo === 'tarifa') nome = head;
      else if (tipo === 'deposito') nome = 'Depósito em dinheiro';
      else if (tipo === 'saque') nome = 'Saque em dinheiro';
      else if (tipo === 'pix_in' || tipo === 'pix_out' || tipo === 'cartao' || tipo === 'estorno') {
        nome = tail;
        var dm = /^([\d.\/-]{6,})\s+(.*)$/.exec(nome);
        if (dm) { docp = dm[1].replace(/\D/g, ''); nome = dm[2]; }
      }

      var id = ['bb', marcas[k].d, lote, doc, cent, sinal].join('|');
      if (vistos[id]) { vistos[id]++; id += '#' + vistos[id]; } else vistos[id] = 1;

      recs.push({
        id: id, tipo: tipo, data: marcas[k].d, dataEvento: dataEv, lote: lote, doc: doc,
        sinal: sinal, cent: sinal === '-' ? -cent : cent, valor: cent / 100,
        hist: head, nome: nome.trim(), nomeNorm: norm(nome), docp: docp
      });
    }

    // conferência: o saldo corrido tem que bater com cada "Saldo do dia"
    var run = null, dias = 0, erros = [];
    recs.forEach(function (r) {
      if (r.tipo === 'saldo_ant') { run = r.cent; return; }
      if (r.tipo === 'saldo_dia' || r.tipo === 'saldo_fim') {
        if (run !== null) { dias++; if (run !== r.cent) erros.push(dmy(r.data) + ': calculado ' + brl(run / 100) + ' ≠ banco ' + brl(r.cent / 100)); }
        return;
      }
      if (run !== null) run += r.cent;
    });

    var sfBB = null;
    recs.forEach(function (r) { if (r.tipo === 'saldo_dia' || r.tipo === 'saldo_fim') sfBB = { data: r.data, valor: r.cent / 100 }; });
    var linhas = recs.filter(function (r) { return r.tipo.indexOf('saldo') !== 0; });
    return { periodo: periodo, linhas: linhas, saldoFinal: sfBB, conferencia: { ok: erros.length === 0 && dias > 0, dias: dias, erros: erros }, avisos: avisos };
  }

  // ───────────────────────── FUNCIONÁRIOS (RH) ─────────────────────────
  // ───────────────────────── PARSER OFX (qualquer banco) ─────────────────────────
  // Gera o mesmo formato do parser do BB, então o resto do fluxo não muda.
  function parseOFX(texto) {
    texto = String(texto || '').replace(/\r/g, '');
    function tag(bloco, nome) {
      var m = new RegExp('<' + nome + '>([^<\\n]*)', 'i').exec(bloco);
      return m ? m[1].trim() : '';
    }
    function dataOFX(v) {
      var m = /^(\d{4})(\d{2})(\d{2})/.exec(v || '');
      return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
    }
    var blocos = texto.split(/<STMTTRN>/i).slice(1).map(function (b) { return b.split(/<\/STMTTRN>|<\/BANKTRANLIST>/i)[0]; });
    var recs = [], avisos = [], vistos = {};
    blocos.forEach(function (b) {
      var data = dataOFX(tag(b, 'DTPOSTED'));
      var bruto = tag(b, 'TRNAMT');
      if (bruto.indexOf('.') < 0) bruto = bruto.replace(',', '.');
      var amt = parseFloat(bruto.replace(/[^\d.\-+]/g, ''));
      if (!data || isNaN(amt)) { avisos.push('Lançamento ilegível: ' + b.slice(0, 40).replace(/\s+/g, ' ')); return; }
      var cent = Math.round(amt * 100);
      if (cent === 0) return;
      var sinal = cent < 0 ? '-' : '+';
      var memo = (tag(b, 'MEMO') || tag(b, 'NAME')).replace(/\s+/g, ' ').trim();
      var mn = norm(memo);
      var tipo = 'outro';
      if (/RENDE FACIL|APLIC(ACAO)? AUTOM|RESG(ATE)? AUTOM|INVEST FACIL/.test(mn)) tipo = 'rende';
      else if (sinal === '-' && /TARIFA|^TAR |CESTA|ANUIDADE|^IOF|MANUT/.test(mn)) tipo = 'tarifa';
      else if (sinal === '+' && /PIX/.test(mn) && /DEVOLV|ESTORNO/.test(mn)) tipo = 'estorno';
      else if (/PIX/.test(mn)) tipo = sinal === '-' ? 'pix_out' : 'pix_in';
      else if (/SAQUE/.test(mn)) tipo = 'saque';
      else if (/DEPOSITO|DEP DINHEIRO/.test(mn)) tipo = 'deposito';
      else if (sinal === '-' && /BOLETO|TITULO|CONVENIO|PAGAMENTO CONTA/.test(mn)) tipo = 'boleto';
      else if (sinal === '-' && /COMPRA|CARTAO|DEBITO/.test(mn)) tipo = 'cartao';

      var docp = '', nome = memo;
      var dm = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{14}\b|\b\d{11}\b/.exec(nome);
      if (dm) { docp = dm[0].replace(/\D/g, ''); nome = nome.replace(dm[0], ' '); }
      if (tipo === 'deposito') nome = 'Depósito em dinheiro';
      else if (tipo === 'saque') nome = 'Saque em dinheiro';
      else if (tipo !== 'tarifa') {
        nome = nome
          .replace(/^(PIX|TRANSF(ERENCIA)?|TED|DOC)\s*(-|:)?\s*(ENVIAD[OA]|RECEBID[OA]|ENVIO|RECEBIMENTO|DEVOLVID[OA]|DEVOLUCAO)?\s*(PIX)?\s*(-|:)?\s*/i, '')
          .replace(/^(COMPRA( NO)?\s*(CARTAO|DEBITO)?|PAGAMENTO( DE)?\s*(BOLETO|TITULO|CONTA)?|PAGTO( DE)?\s*(BOLETO|TITULO)?)\s*(-|:)?\s*/i, '')
          .replace(/\s+/g, ' ').trim();
        if (!nome) nome = memo;
      }
      var fit = tag(b, 'FITID');
      var id = ['ofx', data, fit, cent].join('|');
      if (vistos[id]) { vistos[id]++; id += '#' + vistos[id]; } else vistos[id] = 1;
      recs.push({
        id: id, tipo: tipo, data: data, dataEvento: data, lote: '', doc: fit,
        sinal: sinal, cent: cent, valor: Math.abs(cent) / 100,
        hist: memo, nome: nome, nomeNorm: norm(nome), docp: docp
      });
    });
    var ini = dataOFX(tag(texto, 'DTSTART')), fim = dataOFX(tag(texto, 'DTEND'));
    if (!ini && recs.length) ini = recs.map(function (r) { return r.data; }).sort()[0];
    if (!fim && recs.length) fim = recs.map(function (r) { return r.data; }).sort().slice(-1)[0];
    var periodo = ini ? { mes: ini.slice(0, 7), de: ini, ate: fim || ini } : null;
    var sfOFX = null;
    var lb = /<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/i.exec(texto);
    if (lb) {
      var amt = tag(lb[1], 'BALAMT').replace(/\s/g, ''), dt = dataOFX(tag(lb[1], 'DTASOF'));
      if (/,\d{1,2}$/.test(amt)) amt = amt.replace(/\./g, '').replace(',', '.');
      var nAmt = parseFloat(amt);
      if (isFinite(nAmt) && dt) sfOFX = { data: dt, valor: nAmt };
    }
    return { periodo: periodo, linhas: recs, saldoFinal: sfOFX, conferencia: { ok: false, semConf: true, dias: 0, erros: [] }, avisos: avisos };
  }

  // ───────────────────────── PARSER PLANILHA (XLSX/XLS — Bradesco) ─────────────────────────
  // Entrada: matriz de linhas (array de arrays) da 1ª aba. Gera o mesmo formato
  // dos outros parsers. Colunas: Data | Descrição | Documento | Tipo | Valor | Saldo.
  function parseExtratoPlanilha(rows) {
    var hbb = achaCabecalhoBBPlanilha(rows);
    if (hbb >= 0) return parseExtratoBBPlanilha(rows, hbb);
    function celula(v) { return v == null ? '' : String(v).replace(/\u00a0/g, ' ').trim(); }
    function dinheiro(v) {
      if (typeof v === 'number') return Math.round(v * 100);
      var t = celula(v).replace(/[R$\s]/g, '');
      if (!t || !/\d/.test(t)) return null;
      var neg = /^-|\(.*\)$/.test(t);
      t = t.replace(/[-()]/g, '');
      if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
      var n = parseFloat(t);
      if (isNaN(n)) return null;
      return Math.round(n * 100) * (neg ? -1 : 1);
    }
    function dataBR(v) {
      if (typeof v === 'number' && v > 30000 && v < 80000) {
        var d = new Date(Math.round((v - 25569) * 86400000));
        return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
      }
      var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(celula(v));
      return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
    }

    var periodo = null;
    rows.some(function (r) {
      if (/^PER[IÍ]ODO/i.test(celula(r[0]))) {
        var m = /(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(celula(r[1]));
        if (m) { periodo = { mes: m[3] + '-' + m[2], de: m[3] + '-' + m[2] + '-' + m[1], ate: m[6] + '-' + m[5] + '-' + m[4] }; return true; }
      }
      return false;
    });

    var recs = [], avisos = [], vistos = {}, grupos = {}, ordemDias = [];
    rows.forEach(function (r) {
      var data = dataBR(r[0]);
      if (!data) return;
      var desc = celula(r[1]).replace(/\s+/g, ' ');
      if (!grupos[data]) { grupos[data] = { rows: [], saldoDia: null }; ordemDias.push(data); }
      if (/^SALDO\s*(DO\s*DIA|FINAL)/i.test(desc)) { grupos[data].saldoDia = dinheiro(r[5]); return; }
      if (/^SALDO\s*ANTERIOR/i.test(desc)) return;
      var cent = dinheiro(r[4]);
      if (cent === null) { avisos.push('Sem valor: ' + data + ' ' + desc.slice(0, 40)); return; }
      if (cent === 0) return;
      var tipoCol = celula(r[3]);
      if (/^D[EÉ]BITO/i.test(tipoCol) && cent > 0) cent = -cent;
      if (/^CR[EÉ]DITO/i.test(tipoCol) && cent < 0) cent = -cent;
      var sinal = cent < 0 ? '-' : '+';
      var doc = celula(r[2]);

      // data real da operação: "... 27/10" no fim da descrição
      var dataEv = data, hist = desc;
      var dm0 = /\s(\d{2})\/(\d{2})$/.exec(hist);
      if (dm0) {
        var cand = data.slice(0, 4) + '-' + dm0[2] + '-' + dm0[1];
        if (cand > data) cand = (parseInt(data.slice(0, 4), 10) - 1) + '-' + dm0[2] + '-' + dm0[1];
        dataEv = cand;
        hist = hist.slice(0, dm0.index).trim();
      }
      var mn = norm(hist);
      var tipo = 'outro';
      if (/RENDE FACIL|APLIC(ACAO)? AUTOM|RESG(ATE)? AUTOM|INVEST FACIL/.test(mn)) tipo = 'rende';
      else if (sinal === '-' && /TARIFA|^TAR |CESTA|ANUIDADE|^IOF|MANUT/.test(mn)) tipo = 'tarifa';
      else if (sinal === '+' && /PIX/.test(mn) && /DEVOLV|ESTORNO/.test(mn)) tipo = 'estorno';
      else if (sinal === '-' && /PIX/.test(mn) && /DEVOLV|ESTORNO/.test(mn)) tipo = 'estorno_in';
      else if (/PIX/.test(mn)) tipo = sinal === '-' ? 'pix_out' : 'pix_in';
      else if (/SAQUE/.test(mn)) tipo = 'saque';
      else if (/DEPOSITO|DEP DINHEIRO/.test(mn)) tipo = 'deposito';
      else if (sinal === '-' && /BOLETO|TITULO|CONVENIO|PAGAMENTO CONTA|COBRANCA/.test(mn)) tipo = 'boleto';
      else if (sinal === '-' && /COMPRA|CARTAO|DEBITO/.test(mn)) tipo = 'cartao';

      var nome = hist, docp = '';
      var pm = /\b(?:DES|REM)\s*:\s*(.*)$/i.exec(hist);   // Pix: "DES: fulano" (enviado) / "REM: fulano" (recebido)
      if (pm) nome = pm[1];
      var cp = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{14}\b|\b\d{11}\b/.exec(nome);
      if (cp) { docp = cp[0].replace(/\D/g, ''); nome = nome.replace(cp[0], ' '); }
      if (tipo === 'deposito') nome = 'Depósito em dinheiro';
      else if (tipo === 'saque') nome = 'Saque em dinheiro';
      else if (tipo !== 'tarifa' && !pm) {
        nome = nome
          .replace(/^(PIX|TRANSF(ERENCIA)?|TED|DOC)\s*(-|:)?\s*(ENVIAD[OA]|RECEBID[OA]|ENVIO|RECEBIMENTO|DEVOLVID[OA]|DEVOLUCAO)?\s*(PIX)?\s*(-|:)?\s*/i, '')
          .replace(/^(COMPRA( NO)?\s*(CARTAO|DEBITO)?|PAGAMENTO( DE)?\s*(BOLETO|TITULO|CONTA)?|PAGTO( DE)?\s*(BOLETO|TITULO)?)\s*(-|:)?\s*/i, '');
      }
      nome = nome.replace(/\s+/g, ' ').trim() || hist;

      var id = ['bradesco', data, doc, cent].join('|');
      if (vistos[id]) { vistos[id]++; id += '#' + vistos[id]; } else vistos[id] = 1;
      var rec = {
        id: id, tipo: tipo, data: data, dataEvento: dataEv, lote: '', doc: doc,
        sinal: sinal, cent: cent, valor: Math.abs(cent) / 100,
        hist: hist, nome: nome, nomeNorm: norm(nome), docp: docp
      };
      recs.push(rec);
      grupos[data].rows.push({ cent: cent, saldo: dinheiro(r[5]) });
    });

    // conferência: o saldo linha a linha tem que fechar com o "Saldo do Dia" e
    // com o fechamento do dia anterior presente no arquivo
    var dias = 0, erros = [];
    var diasOrd = ordemDias.slice().sort();
    function cadeiaOk(lista) {
      for (var i = 1; i < lista.length; i++) {
        if (lista[i].saldo === null || lista[i - 1].saldo === null) return false;
        if (lista[i - 1].saldo + lista[i].cent !== lista[i].saldo) return false;
      }
      return true;
    }
    var fechamentoAnterior = null;
    diasOrd.forEach(function (d) {
      var g = grupos[d];
      if (!g.rows.length) { if (g.saldoDia !== null) fechamentoAnterior = g.saldoDia; return; }
      var lista = g.rows;
      if (!cadeiaOk(lista) && cadeiaOk(lista.slice().reverse())) lista = lista.slice().reverse();
      var ok = cadeiaOk(lista) && lista[0].saldo !== null;
      var ultimo = lista[lista.length - 1];
      if (ok && g.saldoDia !== null && ultimo.saldo !== g.saldoDia) ok = false;
      if (ok && fechamentoAnterior !== null && lista[0].saldo - lista[0].cent !== fechamentoAnterior) ok = false;
      dias++;
      if (!ok) erros.push(dmy(d) + ': o saldo da planilha não fecha com os lançamentos');
      if (g.saldoDia !== null) fechamentoAnterior = g.saldoDia;
      else if (ultimo.saldo !== null) fechamentoAnterior = ultimo.saldo;
    });

    if (!periodo && recs.length) {
      var ds = recs.map(function (r) { return r.data; }).sort();
      periodo = { mes: ds[0].slice(0, 7), de: ds[0], ate: ds[ds.length - 1] };
    }
    var sfX = (diasOrd.length && fechamentoAnterior !== null) ? { data: diasOrd[diasOrd.length - 1], valor: fechamentoAnterior / 100 } : null;
    return { periodo: periodo, linhas: recs, saldoFinal: sfX, conferencia: { ok: erros.length === 0 && dias > 0, dias: dias, erros: erros }, avisos: avisos };
  }


  // ───────────────────────── PARSER PLANILHA DO BB (XLSX do app/internet banking) ─────────────────────────
  // Colunas: Data | Lançamento | Detalhes | N° documento | Valor | Tipo Lançamento
  // O NOME de quem recebeu/pagou vem na coluna "Detalhes" (junto com o carimbo "dd/mm hh:mm"
  // e, nos Pix recebidos, o CPF/CNPJ). Por isso este formato precisa de leitor próprio.
  function achaCabecalhoBBPlanilha(rows) {
    for (var i = 0; i < rows.length && i < 40; i++) {
      var r = rows[i] || [];
      if (norm(r[1]) === 'LANCAMENTO' && /^DETALHES/.test(norm(r[2]))) return i;
    }
    return -1;
  }
  function docNormal(d) {
    d = String(d || '').replace(/\D/g, '');
    if (d.length === 14 && d.indexOf('000') === 0) d = d.slice(3);   // CPF vem com zeros na frente
    return d;
  }
  function parseExtratoBBPlanilha(rows, h0) {
    function celula(v) { return v == null ? '' : String(v).replace(/\u00a0/g, ' ').trim(); }
    function dinheiro(v) {
      if (typeof v === 'number') return Math.round(v * 100);
      var t = celula(v).replace(/[R$\s]/g, '');
      if (!t || !/\d/.test(t)) return null;
      var neg = /^-|\(.*\)$/.test(t);
      t = t.replace(/[-()]/g, '');
      if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
      var n = parseFloat(t);
      if (isNaN(n)) return null;
      return Math.round(n * 100) * (neg ? -1 : 1);
    }
    function dataBR(v) {
      if (typeof v === 'number' && v > 30000 && v < 80000) {
        var d = new Date(Math.round((v - 25569) * 86400000));
        return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
      }
      var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(celula(v));
      return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
    }
    var recs = [], avisos = [], vistos = {};
    for (var i = h0 + 1; i < rows.length; i++) {
      var r = rows[i] || [];
      var data = dataBR(r[0]);
      if (!data) continue;
      var hist = celula(r[1]).replace(/\s+/g, ' ');
      if (/^(SALDO|S\s*A\s*L\s*D\s*O)/i.test(hist)) continue;
      var cent = dinheiro(r[4]);
      if (cent === null) { avisos.push('Sem valor: ' + data + ' ' + hist.slice(0, 40)); continue; }
      if (cent === 0) continue;
      var tc = norm(r[5]);
      if (tc === 'SAIDA' && cent > 0) cent = -cent;
      if (tc === 'ENTRADA' && cent < 0) cent = -cent;
      var sinal = cent < 0 ? '-' : '+';
      var det = celula(r[2]).replace(/\s+/g, ' ');
      var doc = celula(r[3]);

      // carimbo da operação + nome
      var dataEv = data, resto = det;
      var sm = /^(\d{2})\/(\d{2})\s+(\d{2}:\d{2})\s*(.*)$/.exec(det);
      if (sm) {
        var cand = data.slice(0, 4) + '-' + sm[2] + '-' + sm[1];
        if (cand > data) cand = (parseInt(data.slice(0, 4), 10) - 1) + '-' + sm[2] + '-' + sm[1];
        dataEv = cand; resto = sm[4];
      }
      var mn = norm(hist);
      var tipo = 'outro';
      if (/RENDE FACIL|APLIC(ACAO)? AUTOM|RESG(ATE)? AUTOM|INVEST FACIL/.test(mn)) tipo = 'rende';
      else if (/^TAR\b|^TARIFA/.test(mn)) tipo = 'tarifa';
      else if (/^PIX/.test(mn) && /DEVOLV/.test(mn)) tipo = sinal === '+' ? 'estorno' : 'estorno_in';
      else if (/^PIX/.test(mn)) tipo = sinal === '-' ? 'pix_out' : 'pix_in';
      else if (/^COMPRA COM CART/.test(mn)) tipo = 'cartao';
      else if (/^DEP/.test(mn) && /DINHEIRO|DEPOSITO/.test(mn)) tipo = 'deposito';
      else if (/^SAQUE/.test(mn)) tipo = 'saque';
      else if (/^PAGAMENTO DE BOLETO|^PAGAMENTO/.test(mn)) tipo = 'boleto';

      var nome = resto, docp = '';
      if (tipo === 'deposito') nome = 'Depósito em dinheiro';
      else if (tipo === 'saque') nome = 'Saque em dinheiro';
      else if (tipo === 'tarifa') nome = hist;
      else if (tipo === 'rende') nome = hist;
      else {
        var dm = /^([\d.\/-]{6,})\s+(.*)$/.exec(nome);       // Pix recebido: \"04065091586 JAILTON RODRIG\"
        if (dm) { docp = docNormal(dm[1]); nome = dm[2]; }
        if (!nome || /^Dinheiro na Conta$/i.test(nome)) nome = nome || hist;
      }
      nome = nome.replace(/\s+/g, ' ').trim();
      if (!nome) nome = (tipo === 'pix_in' || tipo === 'pix_out') ? 'Pix sem identificação' : hist;

      var id = ['bbx', data, doc, cent].join('|');
      if (vistos[id]) { vistos[id]++; id += '#' + vistos[id]; } else vistos[id] = 1;
      recs.push({
        id: id, tipo: tipo, data: data, dataEvento: dataEv, lote: '', doc: doc,
        sinal: sinal, cent: cent, valor: Math.abs(cent) / 100,
        hist: hist, nome: nome, nomeNorm: norm(nome), docp: docp
      });
    }
    var periodo = null;
    if (recs.length) {
      var ds = recs.map(function (x) { return x.data; }).sort(), porMes = {};
      ds.forEach(function (d) { porMes[d.slice(0, 7)] = (porMes[d.slice(0, 7)] || 0) + 1; });
      var mes = Object.keys(porMes).sort(function (a, b) { return porMes[b] - porMes[a]; })[0];
      periodo = { mes: mes, de: ds[0], ate: ds[ds.length - 1] };
    }
    return { periodo: periodo, linhas: recs, saldoFinal: null, conferencia: { ok: false, semConf: true, dias: 0, erros: [] }, avisos: avisos };
  }

  function getFuncs() {
    try {
      if (window.HR_FUNC && HR_FUNC.getFuncionarios) {
        var o = HR_FUNC.getFuncionarios();
        return Object.keys(o).map(function (k) { return o[k]; }).filter(function (f) { return f && f.nome; });
      }
    } catch (e) {}
    return [];
  }
  // Casa automático só quando é o MESMO nome: igual ao cadastro, ou o nome que o banco
  // cortou (começo do nome completo cadastrado, com 2+ palavras). Funcionário cadastrado
  // só como "Hugo" NÃO casa com qualquer Hugo: nesse caso o sistema pergunta uma vez
  // (ver candidatosFunc) e aprende o nome completo que veio no banco.
  function acharFunc(nomeNorm, funcs) {
    if (nomeNorm.length < 8) return null;
    for (var i = 0; i < funcs.length; i++) {
      var f = funcs[i];
      if (f.socio) continue; // sócio: pergunta (pode ser retirada ou transferência interna)
      var fn = norm(f.nome);
      if (fn === nomeNorm) return f;
      if (nomeNorm.split(' ').length >= 2 && fn.indexOf(nomeNorm) === 0) return f;
    }
    return null;
  }
  function funcPorId(funcs, id) {
    for (var i = 0; i < funcs.length; i++) if (String(funcs[i].id) === String(id)) return funcs[i];
    return null;
  }
  // funcionários que PODEM ser essa pessoa (mesmo primeiro nome) — vira botão na pergunta
  function candidatosFunc(nomeNorm, funcs) {
    var p = nomeNorm.split(' ')[0], r = [];
    funcs.forEach(function (f) {
      if (f.socio) return;
      if (norm(f.nome).split(' ')[0] === p) r.push(f);
    });
    return r;
  }

  // ───────────────────────── QUEM É? (tipo de negócio pelo nome) ─────────────────────────
  // Lê o nome de cada Pix/compra e diz o que parece ser: padaria, loja de construção, mercado,
  // posto, oficina, pessoa… A sugestão só destaca um botão; quem decide é você.
  var TIPOS_NEG = [
    { k: 'pagadora',   i: '💳', n: 'Instituição de pagamento', sug: '',        re: /MERCADO PAGO|PAGSEGURO|PAGBANK|PICPAY|INSTITUICAO DE PAGAMENTO|INSTITUICAO D\b/ },
    { k: 'padaria',    i: '🥖', n: 'Padaria',             sug: CAT_ALIM,    re: /PADARIA|PANIFICADORA|PANIFICIO|CONFEITARIA|DOCERIA|\bPAES?\b/ },
    { k: 'construcao', i: '🏗️', n: 'Loja de construção',  sug: 'insumos',     re: /MATERIAL DE CONSTRU|MAT DE CONSTRU|MATERIAIS DE CONSTRU|CONSTRUBASE|CONSTRU|FERRAGEM|FERRAGENS|SERRALHEIR|DEPOSITO DE MATERIA|\bTINTAS?\b|MADEIREIRA|VIDRACARIA|ELETRIC|HIDRAULIC|\bCIMENTO\b/ },
    { k: 'pedra',      i: '🪨', n: 'Mármore / granito',   sug: 'material',    re: /MARMORES|MARMORARIA|GRANIT|PEDRAS\b/ },
    { k: 'posto',      i: '⛽', n: 'Posto / combustível', sug: 'combustivel', re: /POSTO|COMBUSTIV|GASOLIN|PETROBRAS|IPIRANGA/ },
    { k: 'oficina',    i: '🚗', n: 'Oficina / auto peças', sug: 'veiculo',    re: /OFICINA|MECANIC|AUTO PECAS|AUTOPECAS|BORRACHARIA|PNEU|LAVA JATO|LAVAJATO|FUNILARIA|AUTO CENTER|RETIFICA|\bAUTO LTDA|\bAUTO\b.*\bLTDA/ },
    { k: 'conta',      i: '🏠', n: 'Conta fixa / serviço', sug: 'fixo',       re: /NEOENERGIA|COELBA|CACTUSNET|INTERNET|\bAGUA\b|CONTAB|PONTOCONTABIL|ENERGIA|SANEAMENTO|TARIFA/ },
    { k: 'farmacia',   i: '💊', n: 'Farmácia / saúde',     sug: '',   re: /DROGARIA|DROGA|FARMACIA|CLINICA|ODONTO|LABORATORIO/ },
    { k: 'lanche',     i: '🍽️', n: 'Lanche / restaurante', sug: CAT_ALIM,   re: /CHURRASCARIA|LANCH|PASTEL|RESTAURANTE|PIZZ|SORVET|ACAI|HAMBURG|ESPETINHO|KOMBINADO/ },
    { k: 'mercado',    i: '🛒', n: 'Mercado',              sug: CAT_ALIM,   re: /SUPERMERCADO|MERCADINHO|MERCEARIA|MERCADO|COMERCIAL|ATACADO|ATACAREJO|HORTIFRUTI|VERDURA|ACOUGUE|\bMER$/ },
    { k: 'bebidas',    i: '🍺', n: 'Bebidas',              sug: CAT_ALIM,   re: /BEBIDAS|CERVEJ/ },
    { k: 'hotel',      i: '🏨', n: 'Hotel',                sug: 'outros',   re: /\bHOTEL\b|POUSADA/ },
    { k: 'governo',    i: '🏛️', n: 'Governo / taxa',       sug: 'outros',     re: /DEPARTAMENTO|DETRAN|PREFEITURA|RECEITA FEDERAL|SEFAZ|MUNICIPIO|GOVERNO/ },
    { k: 'digital',    i: '💻', n: 'Serviço digital',      sug: 'outros',     re: /GOOGLE|BYTEDANCE|APPMAX|MARSECON|MARKETPLACE|ZUPPER/ }
  ];
  var TIPO_FUNC = { k: 'func', i: '👷', n: 'Funcionário' };
  function tipoNeg(g) {
    var n = g.nomeNorm || '';
    if (!n) return null;
    if (ehProprio(n, g.docp)) return { k: 'proprio', i: '🔁', n: 'Você / sua empresa' };
    for (var i = 0; i < TIPOS_NEG.length; i++) if (TIPOS_NEG[i].re.test(n)) return TIPOS_NEG[i];
    var d = g.docp || '';
    if (d.length === 14) return { k: 'empresa', i: '🏢', n: 'Empresa (CNPJ)' };
    if (d.length === 11) return { k: 'pessoa', i: '🧑', n: 'Pessoa (CPF)' };
    if (n.indexOf(' ') > 0 && !/\d/.test(n) && n.split(' ').length <= 6) return { k: 'pessoa', i: '🧑', n: 'Pessoa' };
    return null;
  }
  // \"MP*DROGARIAPOUPA\", \"PAYGO*SUPERMERCADO R\", \"JIM.COM* HR MARMORES\": tira o prefixo da maquininha
  function limparGateway(nome) {
    return String(nome || '').replace(/^(PAYGO|MP|JIM\.?\s*COM|PG|PAG|SUMUP|IZ|CIELO|STONE|GETNET|PAGSEGURO|PAGBANK|EC|TON|MERCADOPAGO)\s*\*\s*/i, '').trim();
  }
  // O banco corta o nome em ~25 letras e cada tela corta de um jeito (\"ELLEN CRIST\" / \"Ellen Cristina Silva Alve\").
  // Se um nome curto é o começo de UM só nome mais longo do mesmo extrato, usa o nome mais longo.
  function completarNomes(linhas) {
    var tipos = { pix_in: 1, pix_out: 1, cartao: 1, boleto: 1, estorno: 1, estorno_in: 1 };
    var itens = linhas.filter(function (l) { return tipos[l.tipo] && l.nomeNorm && l.nomeNorm.length >= 6; });
    var vistos = {};
    itens.forEach(function (l) { if (!vistos[l.nomeNorm] || l.nome.length > vistos[l.nomeNorm].length) vistos[l.nomeNorm] = l.nome; });
    var nomes = Object.keys(vistos);
    itens.forEach(function (l) {
      var a = l.nomeNorm.replace(/ /g, '');
      if (a.length < 8) return;
      var cands = nomes.filter(function (m) { return m !== l.nomeNorm && m.replace(/ /g, '').indexOf(a) === 0; });
      if (!cands.length) return;
      cands.sort(function (x, y) { return y.length - x.length; });
      var longo = cands[0].replace(/ /g, '');
      if (cands.every(function (c) { return longo.indexOf(c.replace(/ /g, '')) === 0; })) { l.nome = vistos[cands[0]]; l.nomeNorm = cands[0]; }
    });
  }

  // ───────────────────────── REGRAS APRENDIDAS ─────────────────────────
  function lerRegras() { return _ler(K_REGRAS, {}); }
  function achaRegra(regras, dir, nomeNorm) {
    var exato = regras[dir + '|' + nomeNorm];
    if (exato) return exato;
    var ks = Object.keys(regras);
    for (var i = 0; i < ks.length; i++) {
      if (ks[i].indexOf(dir + '|') !== 0) continue;
      if (mesmoGrupo(ks[i].slice(dir.length + 1), nomeNorm)) return regras[ks[i]];
    }
    return null;
  }
  function aprender(dir, nomeNorm, nomeExib, ac) {
    var r = lerRegras();
    r[dir + '|' + nomeNorm] = { ac: ac, n: nomeExib, em: Date.now() };
    _gravar(K_REGRAS, r);
  }
  // o mesmo CNPJ pode aparecer com dois nomes ("SUPERMERCAD" e "R E A RAMOS"): lembra de todos
  function aprenderGrupo(g, ac) {
    var ks = (g.aliasNorms && g.aliasNorms.length) ? g.aliasNorms : [g.nomeNorm];
    ks.forEach(function (k) { aprender(g.dir, k, titulo(g.nome), ac); });
  }

  // aprende com o que já existe no sistema: se lançamentos anteriores com o mesmo
  // nome (palavra de 6+ letras) foram quase sempre da mesma categoria, sugere ela
  function _histCat(nomeNorm) {
    var T = (typeof DB !== 'undefined' && DB.t) ? DB.t : [];
    var palavras = String(nomeNorm || '').split(' ').filter(function (w) { return w.length >= 6; });
    if (!palavras.length || !T.length) return '';
    var cont = {}, tot = 0;
    T.forEach(function (t) {
      if (t.type !== 'out' || !t.cat || t.cat === 'mao_obra' || t.isProLabore || t.origem === 'rh_pagamento') return;
      var d = norm(t.desc);
      if (!palavras.some(function (w) { return d.indexOf(w) >= 0; })) return;
      if (!CATS.some(function (c) { return c.k === t.cat; })) return;
      cont[t.cat] = (cont[t.cat] || 0) + 1; tot++;
    });
    if (tot < 2) return '';
    var melhor = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; })[0];
    return cont[melhor] / tot >= 0.7 ? melhor : '';
  }

  // sugestões (só destacam um botão; quem decide é você)
  function sugerir(g) {
    var n = g.nomeNorm, h = norm(g.hist || '');
    if (g.dir === 'in') {
      if (ehProprio(n, g.docp) || /POUPANCA/.test(h)) return 'interna';
      if (/CASHBACK/.test(h)) return 'entrada';
      return 'cliente';
    }
    if (ehProprio(n, g.docp) || /POUPANCA/.test(h)) return 'interna';
    if (g.neg && g.neg.sug) return g.neg.sug;
    var hc = _histCat(n); if (hc) return hc;
    if (typeof _finGuessCategoria === 'function') { var gc = _finGuessCategoria(g.nome); if (gc && gc !== 'mao_obra') return gc; }
    return '';
  }

  // ───────────────────────── MONTAR O PLANO ─────────────────────────
  function montarPlano(parsed) {
    var regras = lerRegras(), funcs = getFuncs();
    var T = (typeof DB !== 'undefined' && DB.t) ? DB.t : [];
    var jaImp = {};
    T.forEach(function (t) { if (t._extId) jaImp[t._extId] = 1; });
    function mk(t) { return { t: t, usado: false }; }
    var rhEx   = T.filter(function (t) { return t.origem === 'rh_pagamento'; }).map(mk);
    var outEx  = T.filter(function (t) { return t.type === 'out' && t.origem !== 'extrato_bb' && t.origem !== 'rh_pagamento' && t.origem !== 'dinheiro_mao'; }).map(mk);
    var inEx   = T.filter(function (t) { return t.type === 'in' && t.origem !== 'extrato_bb' && t.origem !== 'dinheiro_mao'; }).map(mk);
    var pendEx = T.filter(function (t) { return t.type === 'pend'; }).map(mk);

    function achar(lista, valor, data, extra) {
      for (var i = 0; i < lista.length; i++) {
        var x = lista[i];
        if (x.usado) continue;
        if (Math.abs((x.t.value || 0) - valor) > 0.01) continue;
        if (x.t.date && data && diasEntre(x.t.date, data) > (extra && extra.dias || 5)) continue;
        if (extra && extra.func && x.t.funcionarioId !== extra.func) continue;
        return x;
      }
      return null;
    }

    var linhas = parsed.linhas;
    linhas.forEach(function (l) {
      if (l.tipo === 'cartao') { l.nome = limparGateway(l.nome) || l.nome; l.nomeNorm = norm(l.nome); }
    });
    completarNomes(linhas);
    // devolução que anula um envio (ou um recebimento) de mesmo valor.
    // 1ª tentativa: mesmo nome. 2ª: só o valor, se houver um único candidato (o banco às vezes devolve com outro nome).
    linhas.forEach(function (e) {
      if (e.tipo !== 'estorno' && e.tipo !== 'estorno_in') return;
      var devolveEnvio = e.tipo === 'estorno';
      function achaPar(semNome) {
        var achados = [];
        for (var i = 0; i < linhas.length; i++) {
          var o = linhas[i];
          if (o.estado || o === e) continue;
          if (devolveEnvio ? (o.sinal !== '-' || (o.tipo !== 'pix_out' && o.tipo !== 'cartao')) : (o.sinal !== '+' || o.tipo !== 'pix_in')) continue;
          if (o.cent !== -e.cent || o.dataEvento > e.dataEvento) continue;
          if (diasEntre(o.dataEvento, e.dataEvento) > 15) continue;
          if (!semNome && !mesmoGrupo(o.nomeNorm, e.nomeNorm)) continue;
          if (!semNome) return o;
          achados.push(o);
        }
        return achados.length === 1 ? achados[0] : null;
      }
      var par = achaPar(false) || achaPar(true);
      if (!par) return;
      par.estado = 'ignora'; par.motivo = devolveEnvio ? 'enviado e devolvido' : 'recebido e devolvido';
      e.estado = 'ignora'; e.motivo = par.motivo;
    });

    var grupos = {};
    function noGrupo(l, dir, askEach) {
      var chave = askEach ? dir + '|' + l.id : null;
      if (!chave) {
        var ks = Object.keys(grupos);
        for (var i = 0; i < ks.length; i++) {
          var g0 = grupos[ks[i]];
          if (g0.askEach || g0.dir !== dir) continue;
          // mesmo nome, ou mesmo CPF/CNPJ (mesma pessoa/empresa que o banco escreveu de dois jeitos)
          if (mesmoGrupo(g0.nomeNorm, l.nomeNorm) || (g0.docp && l.docp && g0.docp.length >= 11 && g0.docp === l.docp)) { chave = ks[i]; break; }
        }
        if (!chave) chave = dir + '|' + l.nomeNorm;
      }
      if (!grupos[chave]) grupos[chave] = { key: chave, dir: dir, nome: l.nome, nomeNorm: l.nomeNorm, docp: l.docp, hist: l.hist, askEach: !!askEach, linhas: [], total: 0, aliasNorms: [], apelidos: [] };
      var G = grupos[chave];
      G.linhas.push(l);
      G.total += l.valor;
      if (!G.docp && l.docp) G.docp = l.docp;
      if (G.aliasNorms.indexOf(l.nomeNorm) < 0) { G.aliasNorms.push(l.nomeNorm); G.apelidos.push(l.nome); }
      if (!askEach && l.nome.length > G.nome.length) { G.nome = l.nome; G.nomeNorm = l.nomeNorm; }   // fica o nome mais completo
      l.estado = 'ask'; l._g = G;
      return G;
    }

    linhas.forEach(function (l) {
      if (l.estado) return;
      if (jaImp[l.id]) { l.estado = 'ja'; l.motivo = 'já importado antes'; return; }
      if (l.tipo === 'rende') { l.estado = 'ignora'; l.motivo = 'BB Rende Fácil (aplicação automática)'; return; }
      if (l.tipo === 'tarifa') { l.estado = 'auto'; l.ac = { a: 'cat', cat: 'fixo', label: 'Tarifa bancária' }; return; }

      var dir = (l.tipo === 'estorno') ? 'estorno' : (l.sinal === '+' ? 'in' : 'out');

      // pagamento de funcionário: reconhecido pelo cadastro do RH ou por resposta que você já deu
      if (dir === 'out' && l.tipo !== 'saque') {
        var f = acharFunc(l.nomeNorm, funcs);
        if (!f) {
          var rgf = achaRegra(regras, 'out', l.nomeNorm);
          if (rgf && rgf.ac.a === 'func') f = funcPorId(funcs, rgf.ac.funcId);
        }
        if (f) {
          var rh = achar(rhEx, l.valor, l.dataEvento, { dias: 7, func: f.id });
          if (rh) { rh.usado = true; l.estado = 'ja'; l.motivo = 'RH já lançou (' + f.nome + ')'; return; }
          l.estado = 'auto'; l.ac = { a: 'func', funcId: f.id, label: 'Pagamento — ' + f.nome + ' (extrato)' };
          return;
        }
      }

      // já lançado à mão / por boleto pago / pelo bot. Até R$ 100 a janela de datas é menor (2 dias), pra não confundir miudezas;
      // o que casar vai pra lista "parecem já lançados", onde você ainda pode mandar lançar
      if (l.valor > 0 && dir !== 'estorno') {
        var ex = achar(dir === 'in' ? inEx : outEx, l.valor, l.dataEvento, { dias: l.valor >= 100 ? 5 : 2 });
        if (ex) { ex.usado = true; l.estado = 'dup'; l.motivo = 'já existe "' + (ex.t.desc || '') + '" em ' + dmy(ex.t.date); l.dupDe = ex.t.id; return; }
      }

      var askEach = (l.tipo === 'saque' || l.tipo === 'deposito');
      if (!askEach) {
        var rg = achaRegra(regras, dir, l.nomeNorm);
        if (rg && !(rg.ac.a === 'func' && !funcPorId(funcs, rg.ac.funcId))) { l.estado = 'auto'; l.ac = rg.ac; return; }
      }
      noGrupo(l, dir, askEach);
    });

    // sugestões + possível baixa em "A receber"
    var lista = Object.keys(grupos).map(function (k) { return grupos[k]; });
    lista.forEach(function (g) {
      g.neg = g.askEach ? null : tipoNeg(g);
      g.sug = sugerir(g);
      g.cand = (g.dir === 'out' && !g.askEach) ? candidatosFunc(g.nomeNorm, funcs) : [];
      if (g.dir === 'in' && g.linhas.length === 1) {
        var p = achar(pendEx, g.linhas[0].valor, null, {});
        if (p) g.pend = p.t;
      }
    });
    lista.sort(function (a, b) {
      if (a.askEach !== b.askEach) return a.askEach ? 1 : -1;
      return b.total - a.total;
    });
    return { linhas: linhas, grupos: lista, periodo: parsed.periodo, saldoFinal: parsed.saldoFinal || null, conferencia: parsed.conferencia, avisos: parsed.avisos };
  }

  // ───────────────────────── LANÇAR NO FINANCEIRO ─────────────────────────
  function criarTr(l, ac, impId) {
    var base = { id: Date.now() + Math.random(), date: l.dataEvento || l.data, value: l.valor, origem: 'extrato_bb', _extId: l.id, _extImp: impId, _extNome: titulo(l.nome) };
    var nomeL = titulo(l.nome);
    if (ac.a === 'cat') { base.type = 'out'; base.cat = ac.cat; base.desc = ac.label || nomeL; }
    else if (ac.a === 'terceiro') { base.type = 'out'; base.cat = 'mao_obra'; base.desc = ac.label || ('Pagamento — ' + nomeL); }
    else if (ac.a === 'func') { base.type = 'out'; base.cat = 'mao_obra'; base.desc = ac.label; base.funcionarioId = ac.funcId; }
    else if (ac.a === 'retirada') { base.type = 'out'; base.isProLabore = true; base.desc = ac.label || ('Retirada — ' + nomeL); }
    else if (ac.a === 'cliente' || ac.a === 'entrada') { base.type = 'in'; base.desc = ac.label || ('Pix — ' + nomeL); }
    else if (ac.a === 'abater') { base.type = 'out'; base.cat = ac.cat; base.value = -l.valor; base.desc = ac.label || ('Devolução — ' + nomeL); }
    else return null;
    return base;
  }

  // duplicado que você marcou "lançar mesmo assim": entrada vira entrada, saída vira "Outros"
  function acDup(l) { return l.sinal === '+' ? { a: 'entrada' } : { a: 'cat', cat: 'outros' }; }

  function resumoPlano(plano) {
    var r = { ent: 0, sai: 0, ret: 0, porCat: {}, nTr: 0, nIgn: 0, nJa: 0, nDup: 0, nPul: 0, nAsk: 0 };
    plano.linhas.forEach(function (l) {
      if (l.estado === 'ignora') r.nIgn++;
      else if (l.estado === 'ja') r.nJa++;
      else if (l.estado === 'dup' && !l.forcar) r.nDup++;
      else if (l.estado === 'pulado') r.nPul++;
      else if (l.estado === 'ask') r.nAsk++;
    });
    plano.linhas.forEach(function (l) {
      var ac = l.ac, ok = (l.estado === 'auto' || l.estado === 'resp') && ac;
      if (l.estado === 'dup' && l.forcar) { ac = acDup(l); ok = true; }
      if (!ok) return;
      if (ac.a === 'interna' || ac.a === 'ignorar') { r.nIgn++; return; }
      if (ac.a === 'baixa') { r.ent += l.valor; r.nTr++; return; }
      if (ac.a === 'cliente' || ac.a === 'entrada') { r.ent += l.valor; r.nTr++; return; }
      if (ac.a === 'retirada') { r.ret += l.valor; r.nTr++; return; }
      var cat = ac.a === 'cat' || ac.a === 'abater' ? ac.cat : 'mao_obra';
      var v = ac.a === 'abater' ? -l.valor : l.valor;
      r.sai += v; r.nTr++;
      r.porCat[cat] = (r.porCat[cat] || 0) + v;
    });
    return r;
  }

  function lancar() {
    var S = _S; if (!S || !S.plano) return;
    var impId = 'imp' + Date.now();
    var ids = [], baixas = [], nTr = 0, ent = 0, sai = 0;
    S.plano.linhas.forEach(function (l) {
      var ac = l.ac, ok = (l.estado === 'auto' || l.estado === 'resp') && ac;
      if (l.estado === 'dup' && l.forcar) { ac = acDup(l); ok = true; }
      if (!ok) return;
      if (ac.a === 'interna' || ac.a === 'ignorar') return;
      if (ac.a === 'baixa') {
        var p = DB.t.find(function (x) { return x.id === ac.pendId; });
        if (p) {
          baixas.push({ id: p.id, date: p.date });
          p.type = 'in'; p.date = l.dataEvento || l.data; p._extId = l.id; p._extImp = impId; p._baixaExtrato = true;
          nTr++; ent += l.valor;
        }
        return;
      }
      var tr = criarTr(l, ac, impId);
      if (!tr) return;
      DB.t.unshift(tr); ids.push(tr.id); nTr++;
      if (tr.type === 'in') ent += tr.value; else if (!tr.isProLabore) sai += tr.value;
    });
    var hist = _ler(K_HIST, []);
    hist.unshift({
      id: impId, mes: (S.plano.periodo && S.plano.periodo.mes) || '', arquivo: S.arquivo || '', em: Date.now(),
      n: nTr, ent: ent, sai: sai, ids: ids, baixas: baixas
    });
    _gravar(K_HIST, hist);
    DB.sv();
    try { if (window.HR_FECHDIA && S.plano.periodo) HR_FECHDIA.extratoImportado(S.plano.periodo.mes); } catch (e) {}
    S.etapa = 'fim'; S.fim = { n: nTr, ent: ent, sai: sai };
    try { renderFin(); } catch (e) {}
    desenhar();
  }

  function desfazer(impId) {
    var hist = _ler(K_HIST, []);
    var h = hist.filter(function (x) { return x.id === impId; })[0];
    if (!h) return;
    if (!confirm('Desfazer esta importação? Os ' + h.n + ' lançamentos dela serão removidos.')) return;
    DB.t = DB.t.filter(function (t) {
      if (h.ids.indexOf(t.id) !== -1) { if (DB.marcarExcluido) DB.marcarExcluido('t', t.id); return false; }
      return true;
    });
    (h.baixas || []).forEach(function (b) {
      var p = DB.t.find(function (x) { return x.id === b.id; });
      if (p) { p.type = 'pend'; p.date = b.date; delete p._extId; delete p._extImp; delete p._baixaExtrato; }
    });
    _gravar(K_HIST, hist.filter(function (x) { return x.id !== impId; }));
    DB.sv();
    try { renderFin(); } catch (e) {}
    if (typeof toast === 'function') toast('✓ Importação desfeita');
  }

  // ───────────────────────── LEITURA DO PDF ─────────────────────────
  function carregarPdfJs() {
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return resolve(window.pdfjsLib); }
      var s = document.createElement('script');
      s.src = PDFJS_URL;
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; resolve(window.pdfjsLib); };
      s.onerror = function () { reject(new Error('Sem internet para carregar o leitor de PDF. Conecte e tente de novo.')); };
      document.head.appendChild(s);
    });
  }
  function carregarSheetJS() {
    return new Promise(function (resolve, reject) {
      if (window.XLSX) return resolve(window.XLSX);
      var s = document.createElement('script');
      s.src = SHEETJS_URL;
      s.onload = function () { resolve(window.XLSX); };
      s.onerror = function () { reject(new Error('Sem internet para carregar o leitor de planilha. Conecte e tente de novo.')); };
      document.head.appendChild(s);
    });
  }
  function linhasDaPlanilha(buf) {
    return carregarSheetJS().then(function (X) {
      var wb = X.read(new Uint8Array(buf), { type: 'array' });
      var melhor = [];
      wb.SheetNames.forEach(function (n) {
        var rows = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
        if (rows.length > melhor.length) melhor = rows;
      });
      return melhor;
    });
  }
  function textoDoPdf(buf) {
    return carregarPdfJs().then(function (pdfjs) {
      return pdfjs.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var paginas = [], p = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) {
        (function (num) {
          p = p.then(function () { return pdf.getPage(num); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            paginas.push(tc.items.map(function (it) { return it.str; }).join(' '));
          });
        })(n);
      }
      return p.then(function () { return paginas.join(' \n '); });
    });
  }

  // ───────────────────────── INTERFACE ─────────────────────────
  var _S = null; // estado da importação em andamento

  function injetarCss() {
    if (document.getElementById('extCss')) return;
    var st = document.createElement('style');
    st.id = 'extCss';
    st.textContent =
      '#extOv{font-family:Outfit,sans-serif;color:var(--tx);}' +
      '.ext-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--bd2);}' +
      '.ext-hd b{font-size:15px;color:var(--gold);}' +
      '.ext-x{background:none;border:0;color:var(--t2);font-size:22px;padding:4px 8px;}' +
      '.ext-bd{flex:1;overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch;}' +
      '.ext-ft{display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--bd2);}' +
      '.ext-card{background:var(--s2);border:1px solid var(--bd2);border-radius:14px;padding:14px;margin-bottom:12px;}' +
      '.ext-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;padding:3px 8px;border-radius:20px;}' +
      '.ext-pill.out{background:rgba(201,68,68,.15);color:var(--red);}' +
      '.ext-pill.in{background:rgba(58,158,106,.15);color:var(--grn);}' +
      '.ext-pill.est{background:rgba(74,128,181,.15);color:var(--blu);}' +
      '.ext-pill.neg{background:rgba(201,162,39,.14);color:var(--gold2);font-weight:600;letter-spacing:0;font-size:11px;}' +
      '.ext-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px;}' +
      '.ext-chip{padding:7px 11px;border-radius:20px;border:1px solid var(--bd2);background:var(--s3);color:var(--t2);font-size:12px;font-weight:600;font-family:inherit;}' +
      '.ext-chip.on{border-color:var(--gold);color:var(--gold2);background:#2a2008;}' +
      '.ext-nm{font-size:20px;font-weight:700;margin:8px 0 4px;word-break:break-word;}' +
      '.ext-sub{font-size:13px;color:var(--t2);}' +
      '.ext-ln{font-size:12px;color:var(--t3);margin-top:8px;line-height:1.7;}' +
      '.ext-g{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;}' +
      '.ext-b{padding:12px 8px;border-radius:12px;border:1px solid var(--bd2);background:var(--s3);color:var(--tx);font-size:13px;font-weight:600;text-align:center;font-family:inherit;}' +
      '.ext-b.sug{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset;}' +
      '.ext-b.sug:after{content:" ★";color:var(--gold);}' +
      '.ext-b.w{grid-column:1/-1;}' +
      '.ext-b.p{background:linear-gradient(135deg,#2a2008,#1a1400);border-color:var(--gold);color:var(--gold2);}' +
      '.ext-b.g{background:var(--grn);border-color:var(--grn);color:#fff;}' +
      '.ext-in{width:100%;margin-top:12px;padding:11px 12px;border-radius:10px;border:1px solid var(--bd2);background:var(--s1);color:var(--tx);font-size:14px;font-family:inherit;}' +
      '.ext-bar{height:5px;background:var(--s4);border-radius:5px;margin-bottom:14px;overflow:hidden;}' +
      '.ext-bar i{display:block;height:100%;background:var(--gold);}' +
      '.ext-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px;}' +
      '.ext-row:last-child{border:0;}' +
      '.ext-ok{color:var(--grn);} .ext-warn{color:#e0a030;}' +
      '.ext-lrn{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:var(--t2);}' +
      '.ext-tab-hero{display:flex;gap:12px;align-items:center;}' +
      '.ext-tab-ic{font-size:30px;line-height:1;}' +
      '.ext-tab-t{font-size:15px;font-weight:700;color:var(--gold2);}' +
      '.ext-tab-hero + .ext-b{width:100%;margin-top:14px;}' +
      '.ext-tab-sec{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);font-weight:700;margin:16px 2px 8px;}' +
      '.ext-mini{display:flex;align-items:center;justify-content:space-between;gap:10px;}' +
      '.ext-mini .ext-b{padding:8px 14px;font-size:12px;flex-shrink:0;}' +
      '.ext-row .ext-b{padding:7px 12px;font-size:11px;flex-shrink:0;}' +
      '.fin-imp-wrap{padding:12px 17px 0;}' +
      '.fin-imp{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:14px;border:1px solid var(--gold);background:linear-gradient(135deg,#2a2008,#1a1400);color:var(--gold2);font-family:inherit;font-size:.82rem;font-weight:700;cursor:pointer;}' +
      '.fin-imp small{font-weight:500;opacity:.7;font-size:.62rem;}' +
      '.fin-imp:active{filter:brightness(1.3);}';
    document.head.appendChild(st);
  }
  function ov() {
    injetarCss();
    var el = document.getElementById('extOv');
    if (!el) {
      el = document.createElement('div');
      el.id = 'extOv';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9500;background:var(--bg);display:flex;flex-direction:column;';
      document.body.appendChild(el);
    }
    return el;
  }
  function fechar() {
    var el = document.getElementById('extOv');
    if (el) el.parentNode.removeChild(el);
    _S = null;
    try { renderFin(); } catch (e) {}
  }
  function quadro(titulo_, corpo, rodape) {
    ov().innerHTML = '<div class="ext-hd"><b>' + titulo_ + '</b><button class="ext-x" onclick="HR_EXTRATO.fechar()">✕</button></div>' +
      '<div class="ext-bd" id="extBd">' + corpo + '</div>' + (rodape ? '<div class="ext-ft">' + rodape + '</div>' : '');
  }

  function desenhar() {
    if (!_S) return;
    if (_S.etapa === 'resumo') return telaResumo();
    if (_S.etapa === 'lote') return telaLote();
    if (_S.etapa === 'pergunta') return telaPergunta();
    if (_S.etapa === 'conferencia') return telaConferencia();
    if (_S.etapa === 'pix') return telaPix();
    if (_S.etapa === 'fim') return telaFim();
  }

  // Saldo final do extrato + o que o dono informou na conta no fechamento do dia (soma de todas as contas)
  function saldoFinalHtml(P) {
    if (!P || !P.saldoFinal) return '';
    var sf = P.saldoFinal, h = '<div class="ext-sub" style="margin-top:6px">Saldo final do extrato: <b>R$ ' + brl(sf.valor) + '</b> em ' + dmy(sf.data) + '.</div>';
    try {
      var inf = window.HR_FECHDIA && HR_FECHDIA.saldoContaEm(sf.data);
      if (inf) {
        h += Math.abs(inf.saldoConta - sf.valor) < 0.01
          ? '<div class="ext-ok" style="font-size:13px;">✓ Igual ao saldo da conta que você informou no fechamento de ' + dmy(inf.data) + '</div>'
          : '<div class="ext-sub">No fechamento de ' + dmy(inf.data) + ' você informou R$ ' + brl(inf.saldoConta) + ' na conta (soma de todas as contas, pode incluir outro banco).</div>';
      }
    } catch (e) {}
    return h;
  }

  function telaResumo() {
    var P = _S.plano, r = resumoPlano(P), nGr = P.grupos.length;
    var per = P.periodo ? (P.periodo.mes.slice(5) + '/' + P.periodo.mes.slice(0, 4)) : '';
    var perguntas = P.grupos.reduce(function (s, g) { return s + 1; }, 0);
    var aut = P.linhas.filter(function (l) { return l.estado === 'auto'; }).length;
    var h = '<div class="ext-card"><div style="font-size:13px;color:var(--t2);">Extrato ' + esc(per) + '</div>' +
      '<div style="font-size:26px;font-weight:700;margin:6px 0;">' + P.linhas.length + ' lançamentos</div>' +
      (P.conferencia.semConf
        ? '<div class="ext-sub">Este arquivo não traz o saldo de cada dia, então confira os totais antes de lançar.</div>'
        : P.conferencia.ok
        ? '<div class="ext-ok" style="font-size:13px;">✓ Conferido: o saldo bate com o banco em ' + P.conferencia.dias + ' dias</div>'
        : '<div class="ext-warn" style="font-size:13px;">⚠️ Não consegui conferir o saldo com o banco' + (P.conferencia.erros.length ? ' (' + esc(P.conferencia.erros[0]) + ')' : '') + '. Confira os valores no final.</div>') +
      saldoFinalHtml(P) + '</div>';
    h += '<div class="ext-card">' +
      '<div class="ext-row"><span>🤖 Classificados sozinhos</span><b>' + aut + '</b></div>' +
      '<div class="ext-row"><span>🚫 Ignorados (Rende Fácil, devoluções)</span><b>' + P.linhas.filter(function (l) { return l.estado === 'ignora'; }).length + '</b></div>' +
      '<div class="ext-row"><span>↩️ Já lançados antes (RH, boletos)</span><b>' + (r.nJa + r.nDup) + '</b></div>' +
      '<div class="ext-row"><span>❓ Preciso da sua resposta</span><b>' + nGr + (nGr === 1 ? ' pergunta' : ' perguntas') + '</b></div>' +
      '</div>';
    var nLote = P.grupos.filter(function (g) { return !!acDoSug(g); }).length;
    var nPix = P.linhas.filter(function (l) { return l.tipo === 'pix_in' || l.tipo === 'pix_out'; }).length;
    if (nPix) h += '<button class="ext-b w" style="width:100%;margin-bottom:12px" onclick="HR_EXTRATO.verPix()">📋 Ver cada Pix com o nome (' + nPix + ')</button>';
    if (nGr) h += '<div class="ext-sub">Cada nome é perguntado só uma vez. A resposta vale pra todos os lançamentos dele — e fica lembrada pros próximos meses.</div>';
    quadro('Importar extrato', h, !nGr
      ? '<button class="ext-b p" style="flex:1" onclick="HR_EXTRATO.irConferencia()">Ver resumo e lançar</button>'
      : nLote >= 2
        ? '<button class="ext-b" style="flex:1" onclick="HR_EXTRATO.comecar()">Um por um (' + nGr + ')</button>' +
          '<button class="ext-b p" style="flex:2" onclick="HR_EXTRATO.abrirLote()">⚡ Aceitar sugestões (' + nLote + ')</button>'
        : '<button class="ext-b p" style="flex:1" onclick="HR_EXTRATO.comecar()">Começar (' + nGr + ')</button>');
  }

  function botoesSaida(g) {
    var h = '', sug = g.sug;
    function b(k, txt, cls) { return '<button class="ext-b ' + (cls || '') + (sug === k ? ' sug' : '') + '" onclick="HR_EXTRATO.resp(\'' + k + '\')">' + txt + '</button>'; }
    (g.cand || []).forEach(function (f) {
      h += '<button class="ext-b p w" onclick="HR_EXTRATO.respFunc(\'' + esc(String(f.id)) + '\')">👷 É o funcionário ' + esc(f.nome) + '</button>';
    });
    CATS.slice(0, 2).forEach(function (c) { h += b(c.k, c.i + ' ' + c.n); });
    h += b('funcionario', '👷 Funcionário') + b('terceiro', '🤝 Ajudante / terceiro');
    CATS.slice(2).forEach(function (c) { h += b(c.k, c.i + ' ' + c.n); });
    h += b('retirada', '👤 Pessoal / retirada') + b('interna', '🔁 Transf. interna');
    h += '<div style="grid-column:1/-1;margin-top:6px">' +
      '<div class="ext-sub" style="margin-bottom:4px">✍️ Não achou? Escreva o que é esse gasto:</div>' +
      '<div style="display:flex;gap:8px">' +
      '<input class="ext-in" id="extCat" style="flex:1;margin:0" placeholder="Ex.: Alimentação, Marketing, Manutenção da máquina" onkeydown="if(event.key===\'Enter\'){HR_EXTRATO.novaCategoria()}">' +
      '<button class="ext-b p" style="flex:0 0 auto" onclick="HR_EXTRATO.novaCategoria()">Usar</button>' +
      '</div></div>';
    h += b('ignorar', '🚫 Ignorar', 'w');
    return h;
  }
  function botoesEntrada(g) {
    var sug = g.sug, h = '';
    function b(k, txt, cls) { return '<button class="ext-b ' + (cls || '') + (sug === k ? ' sug' : '') + '" onclick="HR_EXTRATO.resp(\'' + k + '\')">' + txt + '</button>'; }
    if (g.pend) h += '<button class="ext-b p w" onclick="HR_EXTRATO.resp(\'baixa\')">✅ Dar baixa em A Receber: ' + esc(g.pend.desc || '') + ' · R$ ' + brl(g.pend.value) + '</button>';
    h += b('cliente', '💰 Pagamento de cliente') + b('entrada', '↩️ Outra entrada') + b('interna', '🔁 Transf. interna') + b('ignorar', '🚫 Ignorar');
    return h;
  }
  function botoesEstorno(g) {
    var h = '<div class="ext-sub" style="grid-column:1/-1">Em qual categoria abater essa devolução?</div>';
    CATS.forEach(function (c) { h += '<button class="ext-b" onclick="HR_EXTRATO.resp(\'abater:' + c.k + '\')">' + c.i + ' ' + c.n + '</button>'; });
    h += '<button class="ext-b" onclick="HR_EXTRATO.resp(\'interna\')">🔁 Transf. interna</button>';
    h += '<button class="ext-b w" onclick="HR_EXTRATO.resp(\'ignorar\')">🚫 Ignorar</button>';
    return h;
  }

  function telaPergunta() {
    var P = _S.plano, g = P.grupos[_S.i];
    if (!g) { _S.etapa = 'conferencia'; return desenhar(); }
    var pct = Math.round((_S.i / P.grupos.length) * 100);
    var tag = g.dir === 'in' ? '<span class="ext-pill in">ENTRADA</span>' : g.dir === 'estorno' ? '<span class="ext-pill est">DEVOLUÇÃO</span>' : '<span class="ext-pill out">SAÍDA</span>';
    var linhas = g.linhas.slice().sort(function (a, b) { return a.dataEvento < b.dataEvento ? -1 : 1; });
    var prev = linhas.slice(0, 5).map(function (l) { return dmy(l.dataEvento) + ' · R$ ' + brl(l.valor); }).join('<br>') + (linhas.length > 5 ? '<br>+ ' + (linhas.length - 5) + ' outros' : '');
    var h = '<div class="ext-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="ext-sub">' + (_S.i + 1) + ' de ' + P.grupos.length + '</div>' +
      '<div class="ext-card">' + tag +
      '<div class="ext-nm">' + esc(titulo(g.nome)) + '</div>' +
      ((g.cand && g.cand.length) ? '<span class="ext-pill neg">👷 Pode ser funcionário</span> ' : '') +
      (g.neg ? '<span class="ext-pill neg">' + g.neg.i + ' ' + esc(g.neg.n) + '</span>' : '') +
      ((g.apelidos && g.apelidos.length > 1) ? '<div class="ext-sub" style="margin-top:6px">Aparece também como: ' + esc(g.apelidos.filter(function (a) { return a !== g.nome; }).map(titulo).join(', ')) + '</div>' : '') +
      '<div class="ext-sub" style="margin-top:6px">' + g.linhas.length + (g.linhas.length === 1 ? ' lançamento' : ' lançamentos') + ' · R$ ' + brl(g.total) + '</div>' +
      '<div class="ext-ln">' + prev + '</div>';
    if (_S.escolhendoFunc) {
      h += '<div class="ext-sub" style="margin-top:12px">Qual funcionário?</div><div class="ext-g">';
      getFuncs().forEach(function (f) { h += '<button class="ext-b" onclick="HR_EXTRATO.respFunc(\'' + esc(String(f.id)) + '\')">' + esc(f.nome) + '</button>'; });
      h += '<button class="ext-b w" onclick="HR_EXTRATO.voltarBotoes()">← Voltar</button></div>';
    } else {
      var rot = (_S.rotulo[g.key] != null) ? _S.rotulo[g.key] : titulo(g.nome);
      h += '<input class="ext-in" id="extLbl" value="' + esc(rot) + '" placeholder="Como quer chamar? (ex.: Insumos variados)">';
      h += '<div class="ext-g">' + (g.dir === 'in' ? botoesEntrada(g) : g.dir === 'estorno' ? botoesEstorno(g) : botoesSaida(g)) + '</div>';
      if (!g.askEach && g.dir !== 'estorno') {
        h += '<label class="ext-lrn"><input type="checkbox" id="extLrn" ' + (_S.lembrar ? 'checked' : '') + ' onchange="HR_EXTRATO._lembrar(this.checked)"> Lembrar essa resposta nos próximos meses</label>';
      }
    }
    h += '</div>';
    quadro('Classificar', h,
      '<button class="ext-b" style="flex:1;' + (_S.i === 0 ? 'opacity:.4' : '') + '" onclick="HR_EXTRATO.voltar()">← Voltar</button>' +
      '<button class="ext-b" style="flex:1" onclick="HR_EXTRATO.pular()">Pular</button>');
  }

  function telaConferencia() {
    var P = _S.plano, r = resumoPlano(P);
    var h = '<div class="ext-card"><div style="font-size:13px;color:var(--t2)">Vai entrar no financeiro</div>' +
      '<div class="ext-row"><span>💰 Entradas</span><b class="ext-ok">R$ ' + brl(r.ent) + '</b></div>' +
      '<div class="ext-row"><span>📉 Saídas da empresa</span><b style="color:var(--red)">R$ ' + brl(r.sai) + '</b></div>' +
      '<div class="ext-row"><span>👤 Retiradas / pessoal</span><b>R$ ' + brl(r.ret) + '</b></div></div>';
    var ks = Object.keys(r.porCat);
    if (ks.length) {
      h += '<div class="ext-card"><div style="font-size:13px;color:var(--t2);margin-bottom:4px">Saídas por categoria</div>';
      ks.sort(function (a, b) { return r.porCat[b] - r.porCat[a]; }).forEach(function (k) {
        h += '<div class="ext-row"><span>' + catNome(k) + '</span><b>R$ ' + brl(r.porCat[k]) + '</b></div>';
      });
      h += '</div>';
    }
    h += '<div class="ext-card">' +
      '<div class="ext-row"><span>🚫 Ignorados</span><b>' + r.nIgn + '</b></div>' +
      '<div class="ext-row"><span>↩️ Já lançados antes</span><b>' + r.nJa + '</b></div>' +
      (r.nPul ? '<div class="ext-row"><span>⏭️ Pulados (ficam pra próxima)</span><b>' + r.nPul + '</b></div>' : '') + '</div>';
    var dups = P.linhas.filter(function (l) { return l.estado === 'dup'; });
    if (dups.length) {
      h += '<div class="ext-card"><div style="font-size:13px;color:var(--t2);margin-bottom:6px">Parecem já lançados — marque só se NÃO for repetido:</div>';
      dups.forEach(function (l) {
        h += '<label class="ext-row" style="align-items:flex-start"><span><input type="checkbox" ' + (l.forcar ? 'checked' : '') + ' onchange="HR_EXTRATO._forcar(\'' + esc(l.id) + '\',this.checked)"> ' +
          dmy(l.dataEvento) + ' · ' + esc(titulo(l.nome)) + '<br><span style="color:var(--t3);font-size:11px">' + esc(l.motivo) + '</span></span><b>R$ ' + brl(l.valor) + '</b></label>';
      });
      h += '</div>';
    }
    quadro('Conferir e lançar', h,
      '<button class="ext-b" style="flex:1" onclick="HR_EXTRATO.voltarConf()">← Voltar</button>' +
      '<button class="ext-b g" style="flex:2" onclick="HR_EXTRATO.lancar()">Lançar ' + r.nTr + '</button>');
  }

  // ───────────────────────── ACEITAR SUGESTÕES DE UMA VEZ ─────────────────────────
  // Converte a sugestão de um grupo numa ação. Retorna null quando precisa de decisão
  // humana (possível funcionário, saque/depósito, devolução, sem sugestão).
  function acDoSug(g) {
    if (!g || g.askEach || g.dir === 'estorno' || (g.cand && g.cand.length)) return null;
    var s = g.sug, label = titulo(g.nome);
    if (s === 'interna') return { a: 'interna' };
    if (g.dir === 'in') {
      if (g.pend) return { a: 'baixa', pendId: g.pend.id };
      return { a: 'cliente', label: label };
    }
    if (s === 'retirada') return { a: 'retirada', label: 'Retirada — ' + label };
    if (CATS.some(function (c) { return c.k === s; })) return { a: 'cat', cat: s, label: label };
    return null;
  }
  function telaLote() {
    var L = _S.lote, fora = _S.loteFora || {};
    var nOk = L.filter(function (g, i) { return !fora[i]; }).length;
    var h = '<div class="ext-sub">Confira. O que estiver errado, toque em <b>Mudar</b> que eu pergunto depois.</div>';
    L.forEach(function (g, i) {
      var f = !!fora[i], ac = acDoSug(g);
      h += '<div class="ext-card" style="' + (f ? 'opacity:.55' : '') + '">' +
        '<div class="ext-row" style="align-items:center"><span><b>' + esc(titulo(g.nome)) + '</b> ' +
        (g.dir === 'in' ? '<span class="ext-pill in">ENTRADA</span>' : '<span class="ext-pill out">SAÍDA</span>') +
        (g.neg ? ' <span class="ext-pill neg">' + g.neg.i + ' ' + esc(g.neg.n) + '</span>' : '') +
        '<br><span class="ext-sub">' + g.linhas.length + (g.linhas.length === 1 ? ' lançamento' : ' lançamentos') + ' · R$ ' + brl(g.total) + '</span><br>' +
        '<span class="ext-sub">' + (f ? '❓ vou perguntar depois' : esc(descAc(ac))) + '</span></span>' +
        '<button class="ext-b" onclick="HR_EXTRATO.loteMudar(' + i + ')">' + (f ? 'Aceitar' : 'Mudar') + '</button></div></div>';
    });
    h += '<label class="ext-lrn"><input type="checkbox" ' + (_S.lembrar ? 'checked' : '') + ' onchange="HR_EXTRATO._lembrar(this.checked)"> Lembrar essas respostas nos próximos meses</label>';
    quadro('Aceitar sugestões', h,
      '<button class="ext-b" style="flex:1" onclick="HR_EXTRATO.voltarResumo()">← Voltar</button>' +
      '<button class="ext-b g" style="flex:2" onclick="HR_EXTRATO.confirmarLote()">Confirmar (' + nOk + ')</button>');
  }
  function abrirLote() {
    _S.lote = _S.plano.grupos.filter(function (g) { return !!acDoSug(g); });
    _S.loteFora = {};
    _S.etapa = 'lote';
    desenhar();
  }
  function loteMudar(i) {
    _S.loteFora = _S.loteFora || {};
    _S.loteFora[i] = !_S.loteFora[i];
    desenhar();
  }
  function confirmarLote() {
    var fora = _S.loteFora || {};
    _S.lote.forEach(function (g, i) {
      if (fora[i]) return;
      var ac = acDoSug(g);
      if (!ac) return;
      g.linhas.forEach(function (l) { l.estado = 'resp'; l.ac = ac; l.forcar = false; });
      g.respondido = true;
      if (_S.lembrar && ac.a !== 'baixa') aprenderGrupo(g, ac);
    });
    _S.plano.grupos = _S.plano.grupos.filter(function (g) { return !g.respondido; });
    _S.i = 0; _S.lote = null; _S.loteFora = null;
    _S.etapa = _S.plano.grupos.length ? 'pergunta' : 'conferencia';
    desenhar();
  }


  // ───────────────────────── LISTA DE CADA PIX ─────────────────────────
  function tipoDaLinha(l) {
    if (l.estado === 'ignora') return { k: 'ignorado', i: '🚫', n: 'Ignorado' };
    if (l.ac && l.ac.a === 'func') return TIPO_FUNC;
    if (l.motivo && /^RH já lançou/.test(l.motivo)) return TIPO_FUNC;
    var g = l._g;
    if (g && g.cand && g.cand.length) return { k: 'func?', i: '👷', n: 'Pode ser funcionário' };
    return tipoNeg({ nomeNorm: l.nomeNorm, docp: l.docp }) || { k: 'sem', i: '❓', n: 'Sem tipo' };
  }
  function statusDaLinha(l) {
    if ((l.estado === 'auto' || l.estado === 'resp') && l.ac) return descAc(l.ac);
    if (l.estado === 'ask') { var ac = l._g ? acDoSug(l._g) : null; return ac ? 'sugestão: ' + descAc(ac) : '❓ vou perguntar'; }
    if (l.estado === 'pulado') return '⏭️ pulado';
    return l.motivo || '';
  }
  function telaPix() {
    var P = _S.plano, filtro = _S.pixFiltro || 'todos';
    var pix = P.linhas.filter(function (l) { return l.tipo === 'pix_in' || l.tipo === 'pix_out' || l.tipo === 'estorno' || l.tipo === 'estorno_in'; })
      .sort(function (a, b) { return a.dataEvento < b.dataEvento ? -1 : a.dataEvento > b.dataEvento ? 1 : 0; });
    var itens = pix.map(function (l) { return { l: l, t: tipoDaLinha(l) }; });
    var cont = {}, ordem = [];
    itens.forEach(function (x) { if (!cont[x.t.k]) { cont[x.t.k] = { n: 0, t: x.t }; ordem.push(x.t.k); } cont[x.t.k].n++; });
    ordem.sort(function (a, b) { return cont[b].n - cont[a].n; });
    var h = '<div class="ext-sub">Cada Pix com o nome que o banco informou e o que o sistema entendeu. Os nomes que ele não conhece, ele pergunta.</div><div class="ext-chips" style="margin-top:10px">' +
      '<button class="ext-chip ' + (filtro === 'todos' ? 'on' : '') + '" onclick="HR_EXTRATO.pixFiltro(\'todos\')">Todos (' + itens.length + ')</button>';
    ordem.forEach(function (k) {
      h += '<button class="ext-chip ' + (filtro === k ? 'on' : '') + '" onclick="HR_EXTRATO.pixFiltro(\'' + k + '\')">' + cont[k].t.i + ' ' + esc(cont[k].t.n) + ' (' + cont[k].n + ')</button>';
    });
    h += '</div>';
    var vis = itens.filter(function (x) { return filtro === 'todos' || x.t.k === filtro; });
    var tIn = 0, tOut = 0;
    vis.forEach(function (x) { if (x.l.sinal === '+') tIn += x.l.valor; else tOut += x.l.valor; });
    h += '<div class="ext-card"><div class="ext-row"><span>💰 Entradas</span><b class="ext-ok">R$ ' + brl(tIn) + '</b></div><div class="ext-row"><span>📉 Saídas</span><b style="color:var(--red)">R$ ' + brl(tOut) + '</b></div></div>';
    h += '<div class="ext-card">';
    if (!vis.length) h += '<div class="ext-sub">Nenhum Pix nesse filtro.</div>';
    vis.forEach(function (x) {
      var l = x.l, ent = l.sinal === '+';
      h += '<div class="ext-row" style="align-items:flex-start"><span style="min-width:0"><b>' + esc(titulo(l.nome)) + '</b><br>' +
        '<span style="color:var(--t3);font-size:11px">' + dmy(l.dataEvento) + ' · ' + (ent ? 'entrada' : 'saída') + ' · ' + x.t.i + ' ' + esc(x.t.n) + '</span><br>' +
        '<span class="ext-sub" style="font-size:11px">' + esc(statusDaLinha(l)) + '</span></span>' +
        '<b style="white-space:nowrap;color:' + (ent ? 'var(--grn)' : 'var(--red)') + '">' + (ent ? '+' : '−') + ' R$ ' + brl(l.valor) + '</b></div>';
    });
    h += '</div>';
    quadro('Cada Pix', h, '<button class="ext-b p" style="flex:1" onclick="HR_EXTRATO.voltarResumo()">← Voltar</button>');
  }

  function telaFim() {
    var f = _S.fim;
    quadro('Pronto!',
      '<div class="ext-card" style="text-align:center"><div style="font-size:40px">✅</div>' +
      '<div style="font-size:20px;font-weight:700;margin:8px 0">' + f.n + ' lançamentos feitos</div>' +
      '<div class="ext-sub">Entradas R$ ' + brl(f.ent) + ' · Saídas R$ ' + brl(f.sai) + '</div></div>' +
      '<div class="ext-sub">O sistema guardou suas respostas. No próximo extrato ele só vai perguntar o que for novo.</div>',
      '<button class="ext-b p" style="flex:1" onclick="HR_EXTRATO.fechar()">Fechar</button>');
  }

  // ───────────────────────── AÇÕES DA TELA ─────────────────────────
  function rotuloAtual(g) {
    var el = document.getElementById('extLbl');
    var v = el ? el.value.trim() : '';
    return v || titulo(g.nome);
  }
  function aplicarResposta(g, ac, aprende) {
    g.linhas.forEach(function (l) { l.estado = 'resp'; l.ac = ac; l.forcar = false; });
    g.respondido = true;
    if (aprende && !g.askEach && g.dir !== 'estorno' && ac.a !== 'baixa' && ac.a !== 'abater') aprenderGrupo(g, ac);
    _S.i++;
    _S.escolhendoFunc = false;
    desenhar();
  }
  function resp(k) {
    var g = _S.plano.grupos[_S.i]; if (!g) return;
    var aprende = !!_S.lembrar; // vem do checkbox (onchange atualiza _S.lembrar)
    var label = rotuloAtual(g);
    _S.rotulo[g.key] = label;
    var ac;
    if (k === 'funcionario') { _S.escolhendoFunc = true; return desenhar(); }
    if (k === 'interna' || k === 'ignorar') ac = { a: k };
    else if (k === 'retirada') ac = { a: 'retirada', label: 'Retirada — ' + label };
    else if (k === 'terceiro') ac = { a: 'terceiro', label: label };
    else if (k === 'cliente' || k === 'entrada') ac = { a: k, label: label };
    else if (k === 'baixa') ac = { a: 'baixa', pendId: g.pend && g.pend.id };
    else if (k.indexOf('abater:') === 0) ac = { a: 'abater', cat: k.slice(7), label: 'Devolução — ' + titulo(g.nome) };
    else ac = { a: 'cat', cat: k, label: label };
    aplicarResposta(g, ac, aprende);
  }
  // Cria uma categoria sua e já usa nela neste lançamento. Fica salva pra sempre.
  function novaCategoria() {
    var g = _S && _S.plano.grupos[_S.i]; if (!g) return;
    var campo = document.getElementById('extCat');
    var nome = campo ? String(campo.value || '').replace(/\s+/g, ' ').trim() : '';
    if (!nome) { if (campo && campo.focus) campo.focus(); return; }
    var nn = norm(nome);
    var ja = CATS.filter(function (c) { return norm(c.n) === nn; })[0];
    if (!ja) {
      var base = nn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cat';
      var k = 'c_' + base, n = 2;
      while (CATS.some(function (c) { return c.k === k; })) k = 'c_' + base + '_' + (n++);
      var salvas = _ler(K_CATS, []);
      ja = { k: k, i: EMOJIS_CAT[salvas.length % EMOJIS_CAT.length], n: nome.charAt(0).toUpperCase() + nome.slice(1) };
      salvas.push(ja); _gravar(K_CATS, salvas);
      CATS.splice(CATS.length - 1, 0, ja);                       // antes de "Outros"
      registrarCat(ja);
    }
    resp(ja.k);
  }
  function respFunc(fid) {
    var g = _S.plano.grupos[_S.i]; if (!g) return;
    var f = getFuncs().filter(function (x) { return String(x.id) === String(fid); })[0];
    if (!f) return;
    aplicarResposta(g, { a: 'func', funcId: f.id, label: 'Pagamento — ' + f.nome + ' (extrato)' }, !!_S.lembrar);
  }
  function pular() {
    var g = _S.plano.grupos[_S.i]; if (!g) return;
    g.linhas.forEach(function (l) { l.estado = 'pulado'; });
    _S.i++; _S.escolhendoFunc = false; desenhar();
  }
  function voltar() {
    if (_S.i === 0) return;
    _S.i--;
    var g = _S.plano.grupos[_S.i];
    g.linhas.forEach(function (l) { l.estado = 'ask'; l.ac = null; });
    _S.escolhendoFunc = false; desenhar();
  }

  function iniciar(plano, arquivo) {
    _S = { plano: plano, arquivo: arquivo || '', etapa: 'resumo', i: 0, rotulo: {}, lembrar: true, escolhendoFunc: false };
    desenhar();
  }
  function ehPdfBuf(buf) {
    var u = new Uint8Array(buf.slice(0, 5));
    return u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46;
  }
  function ehPlanilhaBuf(buf) {
    var u = new Uint8Array(buf.slice(0, 4));
    var zip = u[0] === 0x50 && u[1] === 0x4B && u[2] === 0x03 && u[3] === 0x04;      // .xlsx
    var ole = u[0] === 0xD0 && u[1] === 0xCF && u[2] === 0x11 && u[3] === 0xE0;      // .xls antigo
    return zip || ole;
  }
  function lerTextoOFX(buf) {
    var u8 = new Uint8Array(buf);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) {}
    try { return new TextDecoder('windows-1252').decode(u8); } catch (e2) {}
    var t = ''; for (var i = 0; i < u8.length; i++) t += String.fromCharCode(u8[i]); return t;
  }
  function importarArquivo(file) {
    if (!file) return;
    if (typeof toast === 'function') toast('Lendo extrato…');
    var fr = new FileReader();
    fr.onerror = function () { alert('Não consegui abrir o arquivo.'); };
    fr.onload = function () {
      var buf = fr.result;
      if (ehPlanilhaBuf(buf)) {
        linhasDaPlanilha(buf).then(function (rows) {
          var pp = parseExtratoPlanilha(rows);
          if (!pp.linhas.length) { alert('Não encontrei lançamentos nessa planilha. Envie o extrato do banco (BB: Data, Lançamento, Detalhes, Documento, Valor, Tipo — ou Bradesco: Data, Descrição, Documento, Tipo, Valor, Saldo).'); return; }
          iniciar(montarPlano(pp), file.name);
        }).catch(function (e) { alert(e && e.message ? e.message : 'Erro ao ler a planilha.'); });
        return;
      }
      if (!ehPdfBuf(buf)) {
        var txt = lerTextoOFX(buf);
        if (!/<STMTTRN>/i.test(txt)) { alert('Arquivo não reconhecido. Envie a planilha (XLSX) ou o OFX do extrato, ou o PDF do BB.'); return; }
        var po = parseOFX(txt);
        if (!po.linhas.length) { alert('Não encontrei lançamentos nesse arquivo OFX.'); return; }
        return iniciar(montarPlano(po), file.name);
      }
      textoDoPdf(new Uint8Array(buf)).then(function (txt) {
        var parsed = parseExtratoBB(txt);
        if (!parsed.linhas.length) { alert('Não encontrei lançamentos nesse PDF. É o "Extrato de Conta Corrente" do Banco do Brasil?'); return; }
        iniciar(montarPlano(parsed), file.name);
      }).catch(function (e) { alert(e && e.message ? e.message : 'Erro ao ler o PDF.'); });
    };
    fr.readAsArrayBuffer(file);
  }
  function escolherArquivo() {
    var inp = document.getElementById('extFile');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'extFile'; inp.accept = '.pdf,.ofx,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/x-ofx,application/octet-stream,text/plain'; inp.style.display = 'none';
      inp.onchange = function () { var f = inp.files && inp.files[0]; inp.value = ''; importarArquivo(f); };
      document.body.appendChild(inp);
    }
    inp.click();
  }

  // ───────────────────────── ABA "EXTRATO" ─────────────────────────
  function renderExtratoTab() {
    injetarCss();
    var hist = _ler(K_HIST, []), regras = lerRegras(), nReg = Object.keys(regras).length;
    var h = '<div class="ext-card" style="margin-top:10px">' +
      '<div class="ext-tab-hero"><div class="ext-tab-ic">📥</div><div>' +
      '<div class="ext-tab-t">Importar extrato do banco</div>' +
      '<div class="ext-sub" style="margin-top:2px">PDF do BB, planilha (XLSX) ou OFX de qualquer banco. Só pergunto o que ainda não sei.</div></div></div>' +
      '<button class="ext-b p" onclick="HR_EXTRATO.escolherArquivo()">Escolher arquivo</button></div>';
    h += '<div class="ext-card"><div class="ext-mini"><div><b>🧠 Regras aprendidas</b>' +
      '<div class="ext-sub">' + nReg + (nReg === 1 ? ' nome lembrado' : ' nomes lembrados') + '</div></div>' +
      '<button class="ext-b" onclick="HR_EXTRATO.verRegras()">Ver</button></div></div>';
    if (hist.length) {
      h += '<div class="ext-tab-sec">Importações feitas</div><div class="ext-card">';
      hist.forEach(function (x) {
        var mes = x.mes ? x.mes.slice(5) + '/' + x.mes.slice(0, 4) : '—';
        h += '<div class="ext-row" style="align-items:center"><span><b>' + esc(mes) + '</b> · ' + x.n + ' lançamentos<br><span style="font-size:11px;color:var(--t3)">Entradas R$ ' + brl(x.ent) + ' · Saídas R$ ' + brl(x.sai) + '</span></span>' +
          '<button class="ext-b" onclick="HR_EXTRATO.desfazer(\'' + esc(x.id) + '\')">Desfazer</button></div>';
      });
      h += '</div>';
    }
    return h;
  }

  function descAc(ac) {
    if (!ac) return '';
    if (ac.a === 'cat') return catNome(ac.cat) + (ac.label ? ' · ' + ac.label : '');
    if (ac.a === 'func') return '👷 ' + (ac.label || 'Funcionário');
    if (ac.a === 'terceiro') return '🤝 Ajudante / terceiro';
    if (ac.a === 'retirada') return '👤 Pessoal / retirada';
    if (ac.a === 'cliente') return '💰 Pagamento de cliente';
    if (ac.a === 'entrada') return '↩️ Outra entrada';
    if (ac.a === 'interna') return '🔁 Transferência interna';
    if (ac.a === 'ignorar') return '🚫 Ignorar';
    if (ac.a === 'baixa') return '✅ Baixa em "A receber"';
    return ac.a;
  }
  function verRegras() {
    var r = lerRegras(), ks = Object.keys(r).sort(function (a, b) { return r[a].n < r[b].n ? -1 : 1; });
    var h = '';
    if (!ks.length) h = '<div class="ext-sub">Ainda não aprendi nada. Importe um extrato e responda às perguntas.</div>';
    else {
      h = '<div class="ext-card">';
      ks.forEach(function (k) {
        h += '<div class="ext-row" style="align-items:center"><span><b>' + esc(r[k].n) + '</b> <span style="color:var(--t3);font-size:11px">' + (k.indexOf('in|') === 0 ? 'entrada' : 'saída') + '</span><br><span class="ext-sub">' + esc(descAc(r[k].ac)) + '</span></span>' +
          '<button class="ext-b" onclick="HR_EXTRATO.esquecer(\'' + esc(k).replace(/\\/g, '\\\\') + '\')">Esquecer</button></div>';
      });
      h += '</div>';
    }
    quadro('Regras aprendidas', h, '<button class="ext-b p" style="flex:1" onclick="HR_EXTRATO.fechar()">Fechar</button>');
  }
  function esquecer(k) {
    var r = lerRegras();
    delete r[k];
    _gravar(K_REGRAS, r);
    verRegras();
  }

  // ───────────────────────── ENCAIXE NO APP ─────────────────────────
  function instalarAba() {
    var tabs = document.querySelector('.fin-tabs');
    if (tabs && !tabs.querySelector('[data-ftab="extrato"]')) {
      var d = document.createElement('div');
      d.className = 'fin-tab';
      d.setAttribute('data-ftab', 'extrato');
      d.textContent = '📥 Extrato';
      tabs.appendChild(d);
    }
    var grid = document.getElementById('finMiniCards');
    if (grid && !document.getElementById('finImpBtn') && !document.querySelector('.fin-actions')) {
      var w = document.createElement('div');
      w.className = 'fin-imp-wrap'; w.id = 'finImpBtn';
      w.innerHTML = '<button class="fin-imp" onclick="finTab(\'extrato\');var b=document.getElementById(\'finBody\');if(b&&b.scrollIntoView)b.scrollIntoView({behavior:\'smooth\',block:\'start\'})">📥 Importar extrato do banco <small>PDF, XLSX ou OFX</small></button>';
      grid.parentNode.insertBefore(w, grid.nextSibling);
      injetarCss();
    }
    if (typeof window.renderFinBody === 'function' && !window.renderFinBody._extPatched) {
      var orig = window.renderFinBody;
      var novo = function () {
        if (window._finTab === 'extrato') {
          var body = document.getElementById('finBody');
          if (body) body.innerHTML = renderExtratoTab();
          var on0 = document.querySelector('.fin-tab.on');
          if (on0 && on0.scrollIntoView) on0.scrollIntoView({ inline: 'center', block: 'nearest' });
          return;
        }
        var r = orig.apply(this, arguments);
        var on = document.querySelector('.fin-tab.on');
        if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
        return r;
      };
      novo._extPatched = true;
      window.renderFinBody = novo;
    }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', instalarAba);
    else instalarAba();
  }

  window.HR_EXTRATO = {
    escolherArquivo: escolherArquivo, fechar: fechar,
    comecar: function () { _S.etapa = 'pergunta'; _S.i = 0; desenhar(); },
    irConferencia: function () { _S.etapa = 'conferencia'; desenhar(); },
    voltarConf: function () { if (_S.plano.grupos.length) { _S.etapa = 'pergunta'; _S.i = Math.max(0, _S.plano.grupos.length - 1); var g = _S.plano.grupos[_S.i]; g.linhas.forEach(function (l) { l.estado = 'ask'; l.ac = null; }); desenhar(); } else { _S.etapa = 'resumo'; desenhar(); } },
    abrirLote: abrirLote, loteMudar: loteMudar, confirmarLote: confirmarLote,
    voltarResumo: function () { _S.etapa = 'resumo'; desenhar(); },
    verPix: function () { _S.etapa = 'pix'; _S.pixFiltro = 'todos'; desenhar(); },
    pixFiltro: function (k) { _S.pixFiltro = k; desenhar(); },
    resp: resp, respFunc: respFunc, novaCategoria: novaCategoria, pular: pular, voltar: voltar,
    voltarBotoes: function () { _S.escolhendoFunc = false; desenhar(); },
    lancar: lancar, desfazer: desfazer, verRegras: verRegras, esquecer: esquecer,
    _lembrar: function (v) { _S.lembrar = v; },
    _forcar: function (id, v) { _S.plano.linhas.forEach(function (l) { if (l.id === id) l.forcar = v; }); },
    renderTab: renderExtratoTab, iniciar: iniciar, _estado: function () { return _S; },
    _parse: parseExtratoBB, _parseOFX: parseOFX, _parseXLSX: parseExtratoPlanilha, _plano: montarPlano, _tipoNeg: tipoNeg
  };
})();
