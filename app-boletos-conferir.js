// ═══════════════════════════════════════════════════════════════════════════
// BOLETOS › CONFERIR COM O FORNECEDOR
//
// Lê a "Listagem de Contas a Receber por Cliente" que o fornecedor entrega
// (PDF) e compara com os boletos "a pagar" do app. O que está na listagem é o
// que o fornecedor ainda cobra; o que o app tem em aberto e NÃO está lá,
// provavelmente já foi pago.
//
//   ✔ Confirmados      — estão nos dois: falta pagar de verdade
//   ➕ Faltam no app    — o fornecedor cobra e o app não tem: cria o boleto
//   ✅ Provavelmente pagos — o app acha que falta, o fornecedor não cobra mais
//   ⚠ Conferir         — o app diz "pago", mas o fornecedor ainda cobra
//   🕒 Mais novos       — lançados depois da data da listagem (não dá p/ conferir)
//
// Não altera nada sozinho: mostra tudo, o usuário confirma e toca em Aplicar.
// A baixa por conferência NÃO lança saída em Finanças (o pagamento é antigo e
// pode já estar lançado) e pode ser desfeita logo depois.
//
// Não muda o formato dos boletos. Carrega DEPOIS de app-boletos.js.
// ═══════════════════════════════════════════════════════════════════════════

var _bfEstado = null;   // { parsed, res, marcados:{} }
var _bfUndo = null;     // { criados:[ids], alterados:[{id, antes:{}}] }

// ── Utilidades ───────────────────────────────────────────────────────────────
function _bfNum(s) { return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0; }
function _bfISO(s) { var m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
function _bfDataBR(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }
function _bfRs(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function _bfEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _bfNorm(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function _bfHoje() { return (typeof td === 'function') ? td() : new Date().toISOString().split('T')[0]; }
function _bfDataIso(v) { // aceita AAAA-MM-DD ou DD/MM/AAAA
  var s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return _bfISO(s);
}

// "0033378-A/5" -> { base:'33378', n:1, letra:'A', total:5 }   (A=1, B=2 ...)
function _bfParseDoc(nDoc) {
  var s = String(nDoc || '').trim();
  var m = s.match(/(\d{4,8})-([A-Za-z])\s*\/\s*(\d{1,2})/);
  if (m) return { base: m[1].replace(/^0+/, ''), n: m[2].toUpperCase().charCodeAt(0) - 64, letra: m[2].toUpperCase(), total: +m[3] };
  m = s.match(/(\d{4,8})-(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (m) return { base: m[1].replace(/^0+/, ''), n: +m[2], letra: '', total: +m[3] };
  return null;
}
function _bfChaveDoc(d) { return d ? d.base + '#' + d.n : ''; }

// Chave de um boleto do app (pelo nDoc ou pelos campos de carga já gravados)
function _bfChaveBoleto(b) {
  var d = _bfParseDoc(b.nDoc);
  if (d) return _bfChaveDoc(d);
  if (b.cargaId && b.parcAtual !== undefined && b.parcAtual !== '' && b.parcAtual !== null) {
    var pa = b.parcAtual, n = /^[A-Za-z]$/.test(String(pa)) ? String(pa).toUpperCase().charCodeAt(0) - 64 : parseInt(pa, 10);
    if (!isNaN(n)) return String(b.cargaId).replace(/^0+/, '') + '#' + n;
  }
  return '';
}

// ── 1) Leitor da listagem ────────────────────────────────────────────────────
// Não depende da ordem do texto: cada parcela é o trecho que termina em
// "Histórico:". Dentro dele acha o documento, as 2 datas (a menor é a emissão,
// a maior o vencimento) e o primeiro valor diferente de zero.
function bfParseListagem(texto) {
  var t = String(texto || '').replace(/\r/g, ' ').replace(/\s+/g, ' ');
  var dl = t.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/) || t.match(/ID:\s*\d+\s+(\d{2}\/\d{2}\/\d{4})/);
  var tg = t.match(/Total\s*\(Geral\)\s*:\s*([\d.]+,\d{2})/i);
  var nm = t.match(/C[ÓO]DIGO\s+(.+?)\s+FOLHA/i);
  var qd = t.match(/Qt\.?\s*Doc\.?\s*:\s*(\d+)/i);

  // Depois de cada "Histórico:" vêm só totais da própria parcela: tira.
  var limpo = t.replace(/Hist[óo]rico:\s*(?:\d[\d.]*,\d{2}\s+){0,5}/gi, '§ ');
  var partes = limpo.split('§');
  var itens = [], ignorados = 0;
  for (var i = 0; i < partes.length - 1; i++) {   // a última parte é o rodapé
    var p = partes[i];
    var md = p.match(/(\d{4,8})-([A-Za-z])\s*\/\s*(\d{1,2})/) || p.match(/(\d{4,8})-(\d{1,2})\s*\/\s*(\d{1,2})/);
    var datas = (p.match(/\d{2}\/\d{2}\/\d{4}/g) || []).map(_bfISO).filter(Boolean).sort();
    var valores = (p.match(/\d[\d.]*,\d{2}/g) || []).map(_bfNum).filter(function (v) { return v > 0; });
    if (!md || datas.length < 2 || !valores.length) { if (md || datas.length) ignorados++; continue; }
    var doc = _bfParseDoc(md[0]);
    if (!doc) { ignorados++; continue; }
    itens.push({
      nDoc: md[0].replace(/\s+/g, ''), base: doc.base, n: doc.n, letra: doc.letra, total: doc.total,
      emissao: datas[0], venc: datas[datas.length - 1], valor: valores[0], chave: _bfChaveDoc(doc)
    });
  }
  var soma = itens.reduce(function (s, x) { return s + x.valor; }, 0);
  var totalGeral = tg ? _bfNum(tg[1]) : null;
  return {
    fornecedor: (nm && nm[1].replace(/\s+/g, ' ').trim().length <= 70 && !/Listagem|Todas as Empresas/i.test(nm[1])) ? nm[1].replace(/\s+/g, ' ').trim() : '',
    dataListagem: dl ? _bfISO(dl[1]) : '',
    itens: itens, ignorados: ignorados,
    soma: Math.round(soma * 100) / 100, totalGeral: totalGeral,
    qtDoc: qd ? +qd[1] : null,
    confere: totalGeral !== null ? Math.abs(soma - totalGeral) < 0.015 && (qd ? itens.length === +qd[1] : true) : null
  };
}

// ── 2) Conciliação (função pura: recebe a lista e os boletos) ────────────────
function bfConciliar(parsed, boletos, hoje) {
  var dataL = parsed.dataListagem || hoje;
  var pagar = (boletos || []).filter(function (b) { return b && b.tipo === 'pagar' && b.status !== 'cancelado'; });
  // Boletos do fornecedor lançados por engano como A RECEBER: mesmo documento da listagem, mesma nota,
  // ou mesmo valor e vencimento de uma parcela da listagem. Entram na conferência como A PAGAR.
  var basesL = {}, chavesL = {}, valVenc = {};
  parsed.itens.forEach(function (it) { basesL[it.base] = true; chavesL[it.chave] = true; valVenc[it.venc + '|' + it.valor.toFixed(2)] = true; });
  var trocados = (boletos || []).filter(function (b) {
    if (!b || b.tipo !== 'receber' || b.status === 'cancelado') return false;
    var d = _bfParseDoc(b.nDoc), k = _bfChaveBoleto(b);
    return (k && chavesL[k]) || (d && basesL[d.base]) || (b.cargaId && basesL[String(b.cargaId).replace(/^0+/, '')]) || valVenc[b.venc + '|' + (+b.valor || 0).toFixed(2)];
  });
  pagar = pagar.concat(trocados);
  var usados = {};                       // id do boleto -> item da listagem
  var pares = [];                        // { item, b, por }

  // 1ª passada: pelo número do documento
  var porChave = {};
  pagar.forEach(function (b) { var k = _bfChaveBoleto(b); if (k) (porChave[k] = porChave[k] || []).push(b); });
  parsed.itens.forEach(function (it) {
    var cand = (porChave[it.chave] || []).filter(function (b) { return !usados[b.id]; });
    if (!cand.length) return;
    // se houver mais de um, prefere o que tem o mesmo valor
    var b = cand.filter(function (x) { return Math.abs((x.valor || 0) - it.valor) < 0.015; })[0] || cand[0];
    usados[b.id] = it; pares.push({ item: it, b: b, por: 'documento' }); it._par = true;
  });

  // fornecedor = quem apareceu nos pares (cnpj / nome) + notas da listagem
  var cnpjs = {}, nomes = {}, bases = {};
  parsed.itens.forEach(function (it) { bases[it.base] = true; });
  pares.forEach(function (p) {
    if (p.b.cnpjBenef) cnpjs[String(p.b.cnpjBenef).replace(/\D/g, '')] = true;
    if (p.b.cli) nomes[_bfNorm(p.b.cli)] = true;
  });
  function mesmoFornecedor(b) {
    if (trocados.indexOf(b) >= 0) return true;
    if (b.cnpjBenef && cnpjs[String(b.cnpjBenef).replace(/\D/g, '')]) return true;
    if (b.cli && nomes[_bfNorm(b.cli)]) return true;
    var k = _bfParseDoc(b.nDoc); if (k && bases[k.base]) return true;
    if (b.cargaId && bases[String(b.cargaId).replace(/^0+/, '')]) return true;
    return false;
  }

  // 2ª passada (mais fraca): mesmo valor e mesmo vencimento, entre boletos do mesmo fornecedor
  parsed.itens.forEach(function (it) {
    if (it._par) return;
    var b = pagar.filter(function (x) {
      return !usados[x.id] && mesmoFornecedor(x) && x.venc === it.venc && Math.abs((x.valor || 0) - it.valor) < 0.015;
    })[0];
    if (b) { usados[b.id] = it; pares.push({ item: it, b: b, por: 'valor e data' }); it._par = true; }
  });

  var r = { trocados: trocados, confirmados: [], criar: [], provPagos: [], conflitos: [], novos: [], pagosDepois: [], duplicados: [], jaBatem: 0, dataListagem: dataL };

  pares.forEach(function (p) {
    var b = p.b;
    if (b.status === 'pago') {
      var dp = _bfDataIso(b.dtPag);
      if (dp && dp > dataL) r.pagosDepois.push(p); else r.conflitos.push(p);
    } else r.confirmados.push(p);
  });
  parsed.itens.forEach(function (it) { if (!it._par) r.criar.push(it); });

  pagar.forEach(function (b) {
    if (usados[b.id]) return;
    if (b.status === 'pago') { if (mesmoFornecedor(b)) r.jaBatem++; return; }
    if (!mesmoFornecedor(b)) return;
    var gemeo = pares.filter(function (p) { return p.b.venc === b.venc && Math.abs((p.b.valor || 0) - (b.valor || 0)) < 0.015; })[0];
    if (gemeo) { r.duplicados.push({ b: b, de: gemeo.b }); return; }
    var ref = _bfDataIso(b.dtEmissao) || _bfDataIso(b.dtCriado) || '';
    var antigo = (b.venc && b.venc <= dataL) || (ref && ref <= dataL);
    if (antigo) r.provPagos.push({ b: b }); else r.novos.push({ b: b });
  });

  var key = function (a, c) { return String(a.venc || (a.item && a.item.venc) || (a.b && a.b.venc) || '').localeCompare(String(c.venc || (c.item && c.item.venc) || (c.b && c.b.venc) || '')); };
  r.confirmados.sort(function (a, c) { return a.item.venc.localeCompare(c.item.venc); });
  r.criar.sort(function (a, c) { return a.venc.localeCompare(c.venc); });
  r.provPagos.sort(function (a, c) { return (a.b.venc || '').localeCompare(c.b.venc || ''); });
  r.fornecedorNome = (pares[0] && pares[0].b.cli) || '';
  r._irmaos = function (it) { // um boleto da mesma nota, para copiar fornecedor/CNPJ
    var s = pagar.filter(function (x) { var d = _bfParseDoc(x.nDoc); return (d && d.base === it.base) || (x.cargaId && String(x.cargaId).replace(/^0+/, '') === it.base); })[0];
    return s || null;
  };
  return r;
}

// ── 3) Tela ──────────────────────────────────────────────────────────────────
function bfAbrir() {
  var inp = document.getElementById('bfFile');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'bfFile'; inp.accept = 'application/pdf,.pdf'; inp.style.display = 'none';
    inp.onchange = function () { var f = inp.files && inp.files[0]; inp.value = ''; if (f) bfProcessar(f); };
    document.body.appendChild(inp);
  }
  inp.click();
}

async function bfProcessar(file) {
  var pdfjs;
  try { pdfjs = await _bCarregarPdfJs(); }
  catch (e) { toast('Não consegui carregar a leitura de PDF — verifique a internet e tente de novo'); return; }
  toast('⏳ Lendo a listagem...');
  var texto = '';
  try {
    var pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p), c = await page.getTextContent();
      texto += c.items.map(function (it) { return it.str; }).join(' ') + '\n';
    }
  } catch (e) { toast('Não consegui abrir esse PDF'); return; }
  if (texto.replace(/\s/g, '').length < 40) { toast('Esse PDF não tem texto (parece foto). Use o PDF que o sistema do fornecedor gera.'); return; }

  var parsed = bfParseListagem(texto);
  if (!parsed.itens.length) { toast('Não encontrei parcelas nessa listagem. Ela é o relatório "Contas a Receber por Cliente"?'); return; }
  var res = bfConciliar(parsed, DB.b || [], _bfHoje());
  var marc = {};
  res.criar.forEach(function (it, i) { marc['c' + i] = true; });
  res.provPagos.forEach(function (p, i) { marc['p' + i] = true; });
  res.duplicados.forEach(function (p, i) { marc['d' + i] = true; });
  _bfEstado = { parsed: parsed, res: res, marcados: marc };
  bfRender();
}

function _bfSecao(titulo, cor, n, total, texto, corpo) {
  return '<div style="margin-top:14px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">'
    + '<div style="font-size:.78rem;font-weight:800;color:' + cor + ';">' + titulo + ' (' + n + ')</div>'
    + (total ? '<div style="font-size:.74rem;font-weight:800;color:' + cor + ';">' + _bfRs(total) + '</div>' : '') + '</div>'
    + (texto ? '<div style="font-size:.64rem;color:var(--t3);margin:2px 0 6px;line-height:1.35;">' + texto + '</div>' : '')
    + corpo + '</div>';
}
function _bfLinha(chave, rotulo, sub, valor, cor, marcavel) {
  var on = _bfEstado.marcados[chave];
  return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #0c0c10;">'
    + (marcavel ? '<input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="bfMarcar(\'' + chave + '\',this.checked)" style="width:20px;height:20px;flex:0 0 auto;">' : '')
    + '<div style="flex:1;min-width:0;"><div style="font-size:.74rem;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _bfEsc(rotulo) + '</div>'
    + '<div style="font-size:.62rem;color:' + (cor || 'var(--t3)') + ';">' + sub + '</div></div>'
    + '<div style="font-size:.76rem;font-weight:800;color:var(--tx);white-space:nowrap;">' + _bfRs(valor) + '</div></div>';
}
function bfMarcar(k, v) { if (_bfEstado) { _bfEstado.marcados[k] = !!v; bfRender(true); } }
function bfMarcarTodos(pref, v) {
  if (!_bfEstado) return;
  Object.keys(_bfEstado.marcados).forEach(function (k) { if (k.charAt(0) === pref) _bfEstado.marcados[k] = v; });
  bfRender(true);
}

function bfRender(manterScroll) {
  var E = _bfEstado; if (!E) return;
  var P = E.parsed, R = E.res, hoje = _bfHoje();
  var soma = function (a, f) { return a.reduce(function (s, x) { return s + (f(x) || 0); }, 0); };
  var body = '';

  // resumo
  var okSoma = P.confere === true;
  body += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;">'
    + '<div style="font-size:.7rem;color:var(--t3);">Listagem de ' + _bfDataBR(R.dataListagem) + (P.fornecedor ? ' · ' + _bfEsc(P.fornecedor) : '') + '</div>'
    + '<div style="font-size:.9rem;font-weight:800;color:var(--tx);margin-top:2px;">O fornecedor cobra ' + _bfRs(P.soma) + ' em ' + P.itens.length + ' parcela(s)</div>'
    + '<div style="font-size:.64rem;margin-top:3px;color:' + (okSoma ? 'var(--grn)' : '#ff9d4d') + ';">'
    + (P.confere === null ? 'Não achei o total da listagem para conferir a leitura.' : okSoma ? '✔ Li certo: a soma bate com o total da listagem.' : '⚠ A soma lida (' + _bfRs(P.soma) + ') não bate com o total da listagem (' + _bfRs(P.totalGeral) + '). Não aplique nada e me avise.')
    + '</div></div>';

  // confirmados
  if (R.confirmados.length) {
    var linhas = R.confirmados.map(function (p) {
      var atras = p.item.venc < hoje, d = dDiff(p.item.venc);
      var sub = (atras ? '🔴 vencido há ' + Math.abs(d) + ' dia(s) · ' : 'vence ') + _bfDataBR(p.item.venc) + (!atras && d >= 0 ? ' · em ' + d + 'd' : '');
      if (p.b.venc && p.b.venc !== p.item.venc) sub += ' · <span style="color:#ff9d4d;">no app está ' + _bfDataBR(p.b.venc) + '</span>';
      return _bfLinha('', p.item.nDoc, sub, p.item.valor, atras ? '#ff5555' : 'var(--t3)', false);
    }).join('');
    body += _bfSecao('🔴 Falta pagar (confirmado)', '#ff5555', R.confirmados.length, soma(R.confirmados, function (p) { return p.item.valor; }),
      'Estão no app e o fornecedor também cobra. Nada a fazer aqui.', linhas);
  }

  // criar
  if (R.criar.length) {
    var l2 = R.criar.map(function (it, i) {
      var atras = it.venc < hoje;
      return _bfLinha('c' + i, it.nDoc, (atras ? '🔴 vencido · ' : 'vence ') + _bfDataBR(it.venc), it.valor, atras ? '#ff5555' : 'var(--t3)', true);
    }).join('');
    body += _bfSecao('➕ Faltam no app', '#e8b847', R.criar.length, soma(R.criar, function (it) { return it.valor; }),
      'O fornecedor cobra e o app não tem. Marcados serão criados como boleto a pagar.', l2);
  }

  // provavelmente pagos
  if (R.provPagos.length) {
    var l3 = R.provPagos.map(function (p, i) {
      return _bfLinha('p' + i, (p.b.nDoc || p.b.desc || p.b.cli || 'Boleto') + (p.b.parc ? ' · ' + p.b.parc : ''), 'vencimento ' + _bfDataBR(p.b.venc) + ' · no app: ' + (p.b.status === 'vencido' ? 'vencido' : 'pendente'), p.b.valor, 'var(--t3)', true);
    }).join('');
    body += _bfSecao('✅ Provavelmente já pagos', '#3ddc84', R.provPagos.length, soma(R.provPagos, function (p) { return p.b.valor; }),
      'O app acha que falta pagar, mas o fornecedor não cobra mais. Marcados serão dados como pagos (sem lançar de novo em Finanças).', l3);
  }

  // duplicados
  if (R.duplicados.length) {
    var l5 = R.duplicados.map(function (p, i) {
      return _bfLinha('d' + i, (p.b.nDoc || p.b.desc || p.b.cli || 'Boleto') + (p.b.parc ? ' · ' + p.b.parc : ''), 'igual a outro já lançado (' + _bfDataBR(p.b.venc) + ') · marque para cancelar a cópia', p.b.valor, 'var(--t3)', true);
    }).join('');
    body += _bfSecao('🧩 Lançados em duplicidade', '#9aa0ff', R.duplicados.length, soma(R.duplicados, function (p) { return p.b.valor; }),
      'Mesmo valor e vencimento de outro boleto que já bate com a listagem. Marcados serão cancelados (continuam no histórico).', l5);
  }

  // conflitos
  if (R.conflitos.length) {
    var l4 = R.conflitos.map(function (p, i) {
      return _bfLinha('x' + i, p.item.nDoc, 'o app diz PAGO' + (p.b.dtPag ? ' em ' + _bfDataBR(_bfDataIso(p.b.dtPag)) : '') + ', mas o fornecedor ainda cobra · marque para reabrir', p.item.valor, '#ff9d4d', true);
    }).join('');
    body += _bfSecao('⚠️ Conferir com o fornecedor', '#ff9d4d', R.conflitos.length, soma(R.conflitos, function (p) { return p.item.valor; }),
      'Pode ser pagamento ainda não baixado por ele, ou erro no app. Só marque se tiver certeza de que NÃO pagou.', l4);
  }

  // novos / pagos depois
  var info = [];
  if (R.trocados && R.trocados.length) info.unshift('🔁 ' + R.trocados.length + ' boleto(s) deste fornecedor estavam em A RECEBER por engano (' + _bfRs(soma(R.trocados, function (b) { return b.valor; })) + '). Ao aplicar, passam para A PAGAR.');
  if (R.novos.length) info.push(R.novos.length + ' boleto(s) lançado(s) depois da data da listagem (' + _bfRs(soma(R.novos, function (p) { return p.b.valor; })) + ') — não dá para conferir ainda.');
  if (R.pagosDepois.length) info.push(R.pagosDepois.length + ' pago(s) depois da listagem — normal, o fornecedor ainda não tinha baixado.');
  if (R.jaBatem) info.push(R.jaBatem + ' já estava(m) pago(s) no app e some(m) da listagem — tudo certo.');
  if (info.length) body += '<div style="margin-top:14px;font-size:.64rem;color:var(--t3);line-height:1.5;">🕒 ' + info.join('<br>🕒 ') + '</div>';

  var nMud = Object.keys(E.marcados).filter(function (k) { return E.marcados[k]; }).length;
  var rodape = '<div style="display:flex;gap:8px;margin-top:14px;">'
    + '<button class="btn btn-o" style="flex:1;margin:0;" onclick="bfFechar()">Fechar</button>'
    + '<button class="btn btn-g" style="flex:2;margin:0;" ' + (((nMud || (R.trocados && R.trocados.length)) && P.confere !== false) ? '' : 'disabled') + ' onclick="bfAplicar()">✔ Aplicar ' + nMud + ' mudança(s)</button></div>';

  var ov = document.getElementById('bfOv'), sc = 0;
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'bfOv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;';
    document.body.appendChild(ov);
  } else { var old = document.getElementById('bfPanel'); sc = old ? old.scrollTop : 0; }
  ov.innerHTML = '<div id="bfPanel" style="width:100%;max-width:640px;max-height:92vh;overflow-y:auto;background:var(--s1,#151515);border:1px solid var(--bd);border-radius:18px 18px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom,0px));">'
    + '<div style="font-size:1rem;font-weight:800;color:var(--tx);margin-bottom:8px;">📑 Conferir com o fornecedor</div>' + body + rodape + '</div>';
  if (manterScroll) { var np = document.getElementById('bfPanel'); if (np) np.scrollTop = sc; }
}

function bfFechar() { var ov = document.getElementById('bfOv'); if (ov) ov.remove(); }

// ── 4) Aplicar e desfazer ────────────────────────────────────────────────────
function bfAplicar() {
  var E = _bfEstado; if (!E || E.parsed.confere === false) return;
  var R = E.res, hoje = _bfHoje(), dataL = R.dataListagem, DBb = DB.b || (DB.b = []);
  var undo = { criados: [], alterados: [] }, nCri = 0, nPag = 0, nReab = 0;
  var nota = 'Conferência com a listagem do fornecedor de ' + _bfDataBR(dataL);

  function guardar(b) { undo.alterados.push({ id: b.id, antes: { status: b.status, dtPag: b.dtPag, obs: b.obs, baixaConferencia: b.baixaConferencia } }); }
  function addObs(b, t) { b.obs = (b.obs ? b.obs + ' | ' : '') + t; }

  var nTroc = 0;
  (R.trocados || []).forEach(function (b) {
    undo.alterados.push({ id: b.id, antes: { tipo: b.tipo, obs: b.obs } });
    b.tipo = 'pagar'; addObs(b, 'Corrigido para A PAGAR pela ' + nota + ' (estava em A receber)'); nTroc++;
  });

  R.criar.forEach(function (it, i) {
    if (!E.marcados['c' + i]) return;
    var irm = R._irmaos(it) || {};
    var nb = {
      id: Date.now() + Math.random(), tipo: 'pagar', cat: irm.cat || 'fornecedor',
      cli: irm.cli || E.parsed.fornecedor || '(fornecedor a definir)', titular: irm.titular || '',
      desc: irm.desc ? String(irm.desc).replace(/\s*[\(\-–—]?\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)?\s*$/, '').trim() : 'Compra nota ' + it.base,
      valor: it.valor, venc: it.venc, parc: it.n + '/' + (it.total || ''), fpag: 'boleto',
      status: it.venc < hoje ? 'vencido' : 'pendente', obs: 'Criado pela ' + nota.toLowerCase(),
      dtCriado: hoje, dtEmissao: it.emissao, nDoc: it.nDoc, cargaId: irm.cargaId || String(it.nDoc).match(/^\d+/)[0],
      parcAtual: it.letra || it.n, parcTotal: it.total || null, cnpjBenef: irm.cnpjBenef || '', compraId: irm.compraId || ''
    };
    DBb.unshift(nb); undo.criados.push(nb.id); nCri++;
  });

  R.provPagos.forEach(function (p, i) {
    if (!E.marcados['p' + i]) return;
    var b = p.b; guardar(b);
    b.status = 'pago';
    b.dtPag = (b.venc && b.venc <= dataL) ? b.venc : dataL;   // data aproximada
    b.baixaConferencia = dataL; addObs(b, 'Baixa pela ' + nota + ' (não cobrado mais)');
    nPag++;
  });

  var nDup = 0;
  R.duplicados.forEach(function (p, i) {
    if (!E.marcados['d' + i]) return;
    var b = p.b; guardar(b);
    b.status = 'cancelado'; addObs(b, 'Cancelado pela ' + nota + ' (duplicado)');
    nDup++;
  });

  R.conflitos.forEach(function (p, i) {
    if (!E.marcados['x' + i]) return;
    var b = p.b; guardar(b);
    b.status = (b.venc && b.venc < hoje) ? 'vencido' : 'pendente'; b.dtPag = '';
    addObs(b, 'Reaberto pela ' + nota + ' (fornecedor ainda cobra)');
    nReab++;
  });

  DB.sv();
  if (typeof bAutoStatus === 'function') bAutoStatus();
  if (typeof _bRerender === 'function') _bRerender();
  if (typeof bUpdDot === 'function') bUpdDot();
  _bfUndo = undo;

  var partes = [];
  if (nTroc) partes.push(nTroc + ' passado(s) de A receber para A pagar');
  if (nCri) partes.push(nCri + ' boleto(s) criado(s)');
  if (nPag) partes.push(nPag + ' dado(s) como pago(s)');
  if (nReab) partes.push(nReab + ' reaberto(s)');
  if (nDup) partes.push(nDup + ' duplicado(s) cancelado(s)');
  var ov = document.getElementById('bfPanel');
  if (ov) ov.innerHTML = '<div style="font-size:1rem;font-weight:800;color:var(--tx);margin-bottom:8px;">✔ Pronto</div>'
    + '<div style="font-size:.8rem;color:var(--t3);line-height:1.5;">' + (partes.join(' · ') || 'Nada foi alterado.') + '.<br>Veja a aba <b>🛒 Compras</b>: cada compra mostra quantas parcelas já foram pagas.</div>'
    + '<div style="display:flex;gap:8px;margin-top:14px;"><button class="btn btn-o" style="flex:1;margin:0;" onclick="bfDesfazer()">↩ Desfazer</button><button class="btn btn-g" style="flex:1;margin:0;" onclick="bfFechar()">Fechar</button></div>';
}

function bfDesfazer() {
  var u = _bfUndo; if (!u) return;
  var DBb = DB.b || [];
  u.criados.forEach(function (id) { var i = DBb.findIndex(function (x) { return x.id === id; }); if (i >= 0) DBb.splice(i, 1); });
  u.alterados.forEach(function (a) {
    var b = DBb.find(function (x) { return x.id === a.id; }); if (!b) return;
    Object.keys(a.antes).forEach(function (k) { if (a.antes[k] === undefined) delete b[k]; else b[k] = a.antes[k]; });
  });
  _bfUndo = null;
  DB.sv();
  if (typeof bAutoStatus === 'function') bAutoStatus();
  if (typeof _bRerender === 'function') _bRerender();
  if (typeof bUpdDot === 'function') bUpdDot();
  bfFechar(); toast('↩ Conferência desfeita');
}

window.bfAbrir = bfAbrir; window.bfProcessar = bfProcessar; window.bfMarcar = bfMarcar; window.bfMarcarTodos = bfMarcarTodos;
window.bfRender = bfRender; window.bfFechar = bfFechar; window.bfAplicar = bfAplicar; window.bfDesfazer = bfDesfazer;
window.bfParseListagem = bfParseListagem; window.bfConciliar = bfConciliar;
