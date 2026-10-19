// ══════════════════════════════════════════════════════════════
// EXTRATO BANCÁRIO → FINANÇAS
// Importa o PDF do extrato (Banco do Brasil) ou um arquivo OFX (qualquer banco),
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

  // Categorias de despesa que já existem em Finanças
  var CATS = [
    { k: 'material',    i: '🪨', n: 'Material (pedra)' },
    { k: 'insumos',     i: '🧰', n: 'Insumos' },
    { k: 'combustivel', i: '⛽', n: 'Combustível' },
    { k: 'fixo',        i: '🏠', n: 'Custo fixo' },
    { k: 'ferramentas', i: '🔧', n: 'Ferramentas' },
    { k: 'outros',      i: '📦', n: 'Outros' }
  ];
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
    for (var j = 0; j < c.nomes.length; j++) if (nomeNorm.indexOf(norm(c.nomes[j])) === 0 && nomeNorm.length >= 8) return true;
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

    var linhas = recs.filter(function (r) { return r.tipo.indexOf('saldo') !== 0; });
    return { periodo: periodo, linhas: linhas, conferencia: { ok: erros.length === 0 && dias > 0, dias: dias, erros: erros }, avisos: avisos };
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
    return { periodo: periodo, linhas: recs, conferencia: { ok: false, semConf: true, dias: 0, erros: [] }, avisos: avisos };
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
    var n = g.nomeNorm;
    if (g.dir === 'in') {
      if (ehProprio(n, g.docp)) return 'interna';
      return 'cliente';
    }
    if (ehProprio(n, g.docp)) return 'interna';
    if (/MARMORES|GRANIT/.test(n)) return 'material';
    if (/SERRALHEIR|CONSTRUBASE|FERRAGEM|ELETRIC|MATERIAL DE CONSTR/.test(n)) return 'insumos';
    if (/POSTO|COMBUSTIV|GASOLIN/.test(n)) return 'combustivel';
    if (/NEOENERGIA|COELBA|CACTUSNET|INTERNET|AGUA|CONTAB|TARIFA/.test(n)) return 'fixo';
    if (/SUPERMERCADO|MERCADINHO|MERCADO|DROGARIA|FARMACIA|CLINICA|ODONTO|CHURRASCARIA|PASTEL|KOMBINADO|HOTEL|VERDURA/.test(n)) return 'retirada';
    if (/GOOGLE|BYTEDANCE|APPMAX|MARSECON/.test(n)) return 'outros';
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
    var inEx   = T.filter(function (t) { return t.type === 'in' && t.origem !== 'extrato_bb'; }).map(mk);
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
    // devolução que anula um envio de mesmo valor
    linhas.forEach(function (e) {
      if (e.tipo !== 'estorno') return;
      for (var i = 0; i < linhas.length; i++) {
        var o = linhas[i];
        if (o.estado || o === e || o.sinal !== '-' || (o.tipo !== 'pix_out' && o.tipo !== 'cartao')) continue;
        if (o.cent !== -e.cent || o.dataEvento > e.dataEvento) continue;
        if (!mesmoGrupo(o.nomeNorm, e.nomeNorm)) continue;
        o.estado = 'ignora'; o.motivo = 'enviado e devolvido';
        e.estado = 'ignora'; e.motivo = 'enviado e devolvido';
        return;
      }
    });

    var grupos = {};
    function noGrupo(l, dir, askEach) {
      var chave = askEach ? dir + '|' + l.id : null;
      if (!chave) {
        var ks = Object.keys(grupos);
        for (var i = 0; i < ks.length; i++) {
          var g0 = grupos[ks[i]];
          if (!g0.askEach && g0.dir === dir && mesmoGrupo(g0.nomeNorm, l.nomeNorm)) { chave = ks[i]; break; }
        }
        if (!chave) chave = dir + '|' + l.nomeNorm;
      }
      if (!grupos[chave]) grupos[chave] = { key: chave, dir: dir, nome: l.nome, nomeNorm: l.nomeNorm, docp: l.docp, askEach: !!askEach, linhas: [], total: 0 };
      grupos[chave].linhas.push(l);
      grupos[chave].total += l.valor;
      l.estado = 'ask';
      return grupos[chave];
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

      // já lançado à mão / por boleto pago (só valores a partir de R$ 100, pra não confundir miudezas)
      if (l.valor >= 100 && dir !== 'estorno') {
        var ex = achar(dir === 'in' ? inEx : outEx, l.valor, l.dataEvento, { dias: 5 });
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
    return { linhas: linhas, grupos: lista, periodo: parsed.periodo, conferencia: parsed.conferencia, avisos: parsed.avisos };
  }

  // ───────────────────────── LANÇAR NO FINANCEIRO ─────────────────────────
  function criarTr(l, ac, impId) {
    var base = { id: Date.now() + Math.random(), date: l.dataEvento || l.data, value: l.valor, origem: 'extrato_bb', _extId: l.id, _extImp: impId };
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
    if (_S.etapa === 'fim') return telaFim();
  }

  function telaResumo() {
    var P = _S.plano, r = resumoPlano(P), nGr = P.grupos.length;
    var per = P.periodo ? (P.periodo.mes.slice(5) + '/' + P.periodo.mes.slice(0, 4)) : '';
    var perguntas = P.grupos.reduce(function (s, g) { return s + 1; }, 0);
    var aut = P.linhas.filter(function (l) { return l.estado === 'auto'; }).length;
    var h = '<div class="ext-card"><div style="font-size:13px;color:var(--t2);">Extrato ' + esc(per) + '</div>' +
      '<div style="font-size:26px;font-weight:700;margin:6px 0;">' + P.linhas.length + ' lançamentos</div>' +
      (P.conferencia.semConf
        ? '<div class="ext-sub">Arquivo OFX: o banco não manda saldo por dia, então confira os totais antes de lançar.</div>'
        : P.conferencia.ok
        ? '<div class="ext-ok" style="font-size:13px;">✓ Conferido: o saldo bate com o banco em ' + P.conferencia.dias + ' dias</div>'
        : '<div class="ext-warn" style="font-size:13px;">⚠️ Não consegui conferir o saldo com o banco' + (P.conferencia.erros.length ? ' (' + esc(P.conferencia.erros[0]) + ')' : '') + '. Confira os valores no final.</div>') +
      '</div>';
    h += '<div class="ext-card">' +
      '<div class="ext-row"><span>🤖 Classificados sozinhos</span><b>' + aut + '</b></div>' +
      '<div class="ext-row"><span>🚫 Ignorados (Rende Fácil, devoluções)</span><b>' + P.linhas.filter(function (l) { return l.estado === 'ignora'; }).length + '</b></div>' +
      '<div class="ext-row"><span>↩️ Já lançados antes (RH, boletos)</span><b>' + (r.nJa + r.nDup) + '</b></div>' +
      '<div class="ext-row"><span>❓ Preciso da sua resposta</span><b>' + nGr + (nGr === 1 ? ' pergunta' : ' perguntas') + '</b></div>' +
      '</div>';
    var nLote = P.grupos.filter(function (g) { return !!acDoSug(g); }).length;
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
      '<div class="ext-sub">' + g.linhas.length + (g.linhas.length === 1 ? ' lançamento' : ' lançamentos') + ' · R$ ' + brl(g.total) + '</div>' +
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
      if (_S.lembrar && ac.a !== 'baixa') aprender(g.dir, g.nomeNorm, titulo(g.nome), ac);
    });
    _S.plano.grupos = _S.plano.grupos.filter(function (g) { return !g.respondido; });
    _S.i = 0; _S.lote = null; _S.loteFora = null;
    _S.etapa = _S.plano.grupos.length ? 'pergunta' : 'conferencia';
    desenhar();
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
    if (aprende && !g.askEach && g.dir !== 'estorno' && ac.a !== 'baixa' && ac.a !== 'abater') aprender(g.dir, g.nomeNorm, titulo(g.nome), ac);
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
      if (!ehPdfBuf(buf)) {
        var txt = lerTextoOFX(buf);
        if (!/<STMTTRN>/i.test(txt)) { alert('Arquivo não reconhecido. Envie o PDF do extrato do BB ou um arquivo OFX.'); return; }
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
      inp.type = 'file'; inp.id = 'extFile'; inp.accept = '.pdf,.ofx,application/pdf,application/x-ofx,application/octet-stream,text/plain'; inp.style.display = 'none';
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
      '<div class="ext-sub" style="margin-top:2px">PDF do BB ou OFX de qualquer banco. Só pergunto o que ainda não sei.</div></div></div>' +
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
      w.innerHTML = '<button class="fin-imp" onclick="finTab(\'extrato\');var b=document.getElementById(\'finBody\');if(b&&b.scrollIntoView)b.scrollIntoView({behavior:\'smooth\',block:\'start\'})">📥 Importar extrato do banco <small>PDF ou OFX</small></button>';
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
    resp: resp, respFunc: respFunc, pular: pular, voltar: voltar,
    voltarBotoes: function () { _S.escolhendoFunc = false; desenhar(); },
    lancar: lancar, desfazer: desfazer, verRegras: verRegras, esquecer: esquecer,
    _lembrar: function (v) { _S.lembrar = v; },
    _forcar: function (id, v) { _S.plano.linhas.forEach(function (l) { if (l.id === id) l.forcar = v; }); },
    renderTab: renderExtratoTab, iniciar: iniciar, _estado: function () { return _S; },
    _parse: parseExtratoBB, _parseOFX: parseOFX, _plano: montarPlano
  };
})();
