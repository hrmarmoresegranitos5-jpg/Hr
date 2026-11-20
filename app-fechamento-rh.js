// ══════════════════════════════════════════════════════════════
// APP-FECHAMENTO-RH v1 — "Fechar pagamento"
// Todos os funcionários numa tela só: quanto cada um recebe no período,
// aviso por WhatsApp, relatório de ponto em PDF e pagamento em lote.
//
// Não tem conta própria: usa o MESMO motor do formulário de pagamento
// (HR_FUNC.calcSaldoFuncionario + _calcValorAPagar) e grava pelo MESMO
// registrarPagamento — então o valor mostrado aqui é o valor que o
// formulário "Registrar Pagamento" sugeriria, e tudo cai nas Finanças.
// ══════════════════════════════════════════════════════════════
var HR_FECHAMENTO = (function () {

  var GOLD = '#C9A84C', GOLDB = 'rgba(201,168,76,.35)';
  var S2 = 'var(--s2,#161410)', BD = 'rgba(201,168,76,.12)', BD2 = 'rgba(255,255,255,.07)';
  var T1 = 'var(--t1,#f0ece4)', T2 = 'var(--t2,#b8b0a0)', T3 = 'var(--t3,#7a7268)';
  var GREEN = '#5cb85c', RED = '#c85c5c', AMBER = '#e0b870';

  var OV = 'hrFechamento', OV_CONF = 'hrFechConf';
  var LS_AVISOS = 'hr_fechamento_avisos';
  var _st = { corte: null, sel: {}, linhas: [], ocupado: false, dirty: false, aberto: {} };

  // ── utilitários ─────────────────────────────────────────────
  function _p2(n) { return String(n).padStart(2, '0'); }
  function _iso(d) { return d.getFullYear() + '-' + _p2(d.getMonth() + 1) + '-' + _p2(d.getDate()); }
  function _hojeISO() { return _iso(new Date()); }
  function _m(v) { return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function _dm(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _toast(t) { if (typeof toast === 'function') toast(t); else console.log('[Fechamento]', t); }
  function _soma(arr) { return (arr || []).reduce(function (s, x) { return s + (parseFloat(x.valor) || 0); }, 0); }
  function _avisosGet() { try { return JSON.parse(localStorage.getItem(LS_AVISOS) || '{}') || {}; } catch (e) { return {}; } }
  function _avisoSet(k) { try { var a = _avisosGet(); a[k] = Date.now(); localStorage.setItem(LS_AVISOS, JSON.stringify(a)); } catch (e) {} }

  // ── períodos ────────────────────────────────────────────────
  function _ativos() {
    var fs = HR_FUNC.getFuncionarios();
    return Object.keys(fs).map(function (k) { return fs[k]; })
      .filter(function (f) { return f.ativo !== false && !f.socio; })   // sócio = pró-labore, fora do lote
      .sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  }
  function _np(f) { return HR_FUNC._ehQuinzenal(f) ? 2 : 3; }

  // Datas de pagamento (vencimentos) já chegadas, mais recentes primeiro
  function _vencimentos(ativos) {
    var hoje = _hojeISO(), set = {};
    var d0 = new Date();
    ativos.forEach(function (f) {
      for (var off = 0; off <= 3; off++) {
        var d = new Date(d0.getFullYear(), d0.getMonth() - off, 1);
        for (var n = 1; n <= _np(f); n++) {
          var due = _iso(HR_FUNC._vencDate(f, n, d.getFullYear(), d.getMonth()));
          if (due <= hoje) set[due] = true;
        }
      }
    });
    return Object.keys(set).sort().reverse().slice(0, 5);
  }

  // Último período do funcionário cujo vencimento já chegou até a data de corte
  function _periodoVencido(f, corte) {
    var ano = parseInt(corte.slice(0, 4), 10), mes0 = parseInt(corte.slice(5, 7), 10) - 1;
    for (var off = 0; off <= 3; off++) {
      var d = new Date(ano, mes0 - off, 1), y = d.getFullYear(), m = d.getMonth();
      for (var n = _np(f); n >= 1; n--) {
        var due = _iso(HR_FUNC._vencDate(f, n, y, m));
        if (due <= corte) {
          var mesISO = y + '-' + _p2(m + 1);
          return { num: n, mes: mesISO, due: due, per: HR_FUNC._periodoDecendio(n, mesISO, f) };
        }
      }
    }
    return null;
  }

  // ── cálculo de uma linha (um funcionário) ───────────────────
  function _calc(f, corte, todosRegs) {
    var pv = _periodoVencido(f, corte);
    if (!pv) return null;
    var di = pv.per.di, df = pv.per.df;
    var l = { f: f, pv: pv, erro: false };
    try {
      var s = HR_FUNC.calcSaldoFuncionario(f.id, di, df);
      l.s = s;
      l.valor = HR_FUNC._calcValorAPagar(s, f, true, pv.num, pv.mes);
      l.adi = _soma(HR_FUNC._adiantamentosAlvoDecendio(f.id, pv.num, pv.mes));
      l.cre = _soma(HR_FUNC._creditosAlvoDecendio(f.id, pv.num, pv.mes));
    } catch (e) {
      console.warn('[Fechamento] falha ao calcular', f.nome, e);
      l.erro = true; l.valor = 0; l.s = {}; l.adi = 0; l.cre = 0;
    }
    l.pago = l.s.totalPago || 0;
    var regsPer = todosRegs.filter(function (r) { return r.funcionarioId === f.id && r.data >= di && r.data <= df; });
    l.semPonto = !!l.s.semRegistrosPeriodo || regsPer.length === 0;
    l.semSaida = regsPer.filter(function (r) { return r.entrada && !r.saida; }).length;
    l.status = l.erro ? 'erro' : (l.valor > 0.5 ? 'pagar' : (l.pago > 0.5 ? 'pago' : 'zero'));
    return l;
  }
  function _chave(l) { return l.f.id + '|' + l.pv.due; }
  function _problema(l) { return l.erro || l.semPonto || l.semSaida > 0; }

  // ── mensagem de WhatsApp ────────────────────────────────────
  function _msg(l) {
    var f = l.f, s = l.s, nome = f.nome.split(' ')[0];
    var per = l.pv.per, rot = per.label + ' (' + _dm(per.di) + ' a ' + _dm(per.df) + ')';
    var t = 'Olá ' + nome + '! 👋\n\n';
    if (l.status === 'pago') {
      t += '✅ *Pagamento feito — ' + rot + '*\n💰 Valor: *' + _m(l.pago) + '*\n';
      t += '\n_HR Mármores e Granitos_';
      return t;
    }
    t += '📋 *Seu pagamento — ' + rot + '*\n\n';
    t += '• Fixo: ' + _m(s.totalSalario) + '\n';
    var ext = (s.valorExtra || 0) + (s.totalAcrescimos || 0) + ((s.totalCreditosHE || 0) - (s.totalPendEntra || 0));
    if (ext > 0.01) t += '• Horas extras: +' + _m(ext) + '\n';
    if ((s.totalPendEntra || 0) > 0.01) t += '• Restante do período anterior: +' + _m(s.totalPendEntra) + '\n';
    if ((s.totalPendSai || 0) > 0.01) t += '• Restante passado pro próximo: −' + _m(s.totalPendSai) + '\n';
    if ((s.deficitRestanteValor || 0) > 0.01) t += '• Faltas/atrasos: −' + _m(s.deficitRestanteValor) + '\n';
    if (l.adi > 0.01) t += '• Vale/adiantamento: −' + _m(l.adi) + '\n';
    if (l.cre > 0.01) t += '• Desconto de valor pago a mais: −' + _m(l.cre) + '\n';
    if (l.pago > 0.01) t += '• Já recebido: −' + _m(l.pago) + '\n';
    t += '\n💰 *Você vai receber: ' + _m(l.valor) + '*\n';
    t += '📅 Pagamento: ' + _dm(l.pv.due) + '\n';
    t += '\n_HR Mármores e Granitos_';
    return t;
  }

  // ── tela ────────────────────────────────────────────────────
  function _linhasAtuais() {
    var ativos = _ativos();
    var venc = _vencimentos(ativos);
    if (!_st.corte || (venc.indexOf(_st.corte) < 0 && venc.length)) _st.corte = venc[0] || _hojeISO();
    var regs = Object.values(HR_FUNC.getRegistros());
    var linhas = ativos.map(function (f) { return _calc(f, _st.corte, regs); }).filter(Boolean);
    linhas.forEach(function (l) {
      var k = _chave(l);
      if (_st.sel[k] === undefined) _st.sel[k] = (l.status === 'pagar' && !_problema(l));
    });
    var peso = function (l) { return _problema(l) ? 0 : (l.status === 'pagar' ? 1 : (l.status === 'zero' ? 2 : 3)); };
    linhas.sort(function (a, b) { return peso(a) - peso(b) || a.f.nome.localeCompare(b.f.nome); });
    return { linhas: linhas, venc: venc };
  }

  function _btn(txt, onclick, cor, bg, bd) {
    return '<button onclick="' + onclick + '" style="padding:9px 11px;background:' + (bg || 'rgba(255,255,255,.04)') +
      ';border:1px solid ' + (bd || BD2) + ';border-radius:9px;color:' + (cor || T2) +
      ';font-family:Outfit,sans-serif;font-size:.74rem;font-weight:700;cursor:pointer;white-space:nowrap;">' + txt + '</button>';
  }

  // ── v2: tela "Pagar equipe" — a conta de cada um em linhas simples + o que conferir antes de pagar ──
  function _hm(min) { min = Math.round(Math.abs(min || 0)); return Math.floor(min / 60) + 'h' + _p2(min % 60); }
  function _proxDia(d) { var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + 1); return _iso(x); }
  // o que pode deixar o valor errado — em português claro
  function _conferir(l, regsF) {
    var out = [], hoje = _hojeISO(), per = l.pv.per, porDia = {};
    regsF.forEach(function (r) { porDia[r.data] = r; });
    var vazios = [], d = per.di, guard = 0;
    while (d <= per.df && d <= hoje && guard++ < 40) {
      var esp = 0; try { esp = HR_IMPORT._jornadaEsperada(d, l.f.id) || 0; } catch (e) {}
      var r = porDia[d];
      if (esp > 0 && (!r || (!(parseFloat(r.horas) > 0) && r.tipo !== 'abonado' && r.tipo !== 'falta'))) vazios.push(_dm(d));
      d = _proxDia(d);
    }
    var manhas = []; d = per.di; guard = 0;
    while (d <= per.df && d <= hoje && guard++ < 40) { var esp2 = 0; try { esp2 = HR_IMPORT._jornadaEsperada(d, l.f.id) || 0; } catch (e) {} if (_manhaEsquecida(porDia[d], esp2)) manhas.push(_dm(d) + ' (1ª batida ' + porDia[d].entrada + ')'); d = _proxDia(d); }
    if (manhas.length) out.push({ t: 'Esqueceu de bater de manhã: ' + manhas.join(', ') + '. Está contando como falta. Toque em "Completar a manhã" no dia a dia.', grave: true });
    if (vazios.length) out.push({ t: 'Dia sem ponto: ' + vazios.join(', ') + '. Resolva no dia a dia abaixo: trabalhou, faltou ou atestado.', grave: true });
    if (l.semSaida > 0) out.push({ t: l.semSaida + ' dia(s) com entrada e sem saída.', grave: true });
    if (l.antPend > 0.01) out.push({ t: 'Pode haver ' + _m(l.antPend) + ' em aberto do mês passado (' + l.antLbl + '). NÃO está somado aqui — toque em "Ver ficha" para conferir.', grave: false });
    return out;
  }
  function _linhaConta(rot, val, sinal, cor, sub) {
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:.82rem;">' +
      '<span style="color:' + T2 + ';">' + rot + (sub ? '<div style="font-size:.64rem;color:' + T3 + ';margin-top:1px;">' + sub + '</div>' : '') + '</span>' +
      '<b style="color:' + (cor || T1) + ';white-space:nowrap;">' + (sinal || '') + _m(val) + '</b></div>';
  }
  // dia a dia, sem PDF: quanto devia trabalhar, quanto trabalhou e a diferença
  function _diaADia(l, regsF) {
    var per = l.pv.per, porDia = {}, hoje = _hojeISO(), d = per.di, guard = 0, rows = '';
    var nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    regsF.forEach(function (r) { porDia[r.data] = r; });
    while (d <= per.df && guard++ < 40) {
      var esp = 0; try { esp = HR_IMPORT._jornadaEsperada(d, l.f.id) || 0; } catch (e) {}
      var r = porDia[d], trab = r ? Math.round((parseFloat(r.horas) || 0) * 60) : 0, dow = new Date(d + 'T12:00:00').getDay();
      if (esp === 0 && !trab) { d = _proxDia(d); continue; }
      var futuro = d > hoje, dif = trab - esp, cor = futuro ? T3 : (!r || (!trab && r.tipo !== 'abonado')) ? RED : dif > 0 ? GREEN : dif < 0 ? AMBER : T2;
      var txtDif = futuro ? '—' : (!r && esp) ? 'sem ponto' : (r && r.tipo === 'abonado') ? 'abonado' : (dif === 0 ? 'certo' : (dif > 0 ? '+' : '−') + _hm(dif));
      var horario = r && r.entrada ? r.entrada + '–' + (r.saida || '?') : '—';
      var semP = !futuro && esp > 0 && (!r || (!trab && r.tipo !== 'abonado' && r.tipo !== 'falta'));
      if (r && r.tipo === 'falta') txtDif = 'faltou';
      var esqM = !futuro && _manhaEsquecida(r, esp);
      if (esqM) { cor = AMBER; txtDif = 'esqueceu a manhã?'; }
      var acoes = esqM ? '<div style="display:flex;gap:5px;margin:2px 0 6px 68px;flex-wrap:wrap;">' + _btnP('🕗 Completar a manhã', "HR_FECHAMENTO.diaCompletarManha('" + l.f.id + "','" + d + "')", AMBER) + '</div>' : semP ? '<div style="display:flex;gap:5px;margin:2px 0 6px 68px;flex-wrap:wrap;">' +
        _btnP('✓ Trabalhou', "HR_FECHAMENTO.diaTrabalhou('" + l.f.id + "','" + d + "'," + esp + ")", GREEN) +
        _btnP('✗ Faltou', "HR_FECHAMENTO.diaMarcar('" + l.f.id + "','" + d + "','falta')", RED) +
        _btnP('🩺 Atestado', "HR_FECHAMENTO.diaMarcar('" + l.f.id + "','" + d + "','abonado')", AMBER) + '</div>' : '';
      rows += '<div style="display:grid;grid-template-columns:62px 1fr 52px 70px;gap:6px;padding:5px 0;border-top:1px solid ' + BD2 + ';font-size:.72rem;align-items:center;">' +
        '<span style="color:' + T2 + ';">' + _dm(d) + ' <span style="color:' + T3 + ';font-size:.6rem;">' + nomes[dow] + '</span></span>' +
        '<span style="color:' + T3 + ';">' + horario + (esp && esp < 480 && dow !== 6 ? ' <span style="font-size:.58rem;">(meio período)</span>' : '') + '</span>' +
        '<span style="color:' + T2 + ';text-align:right;">' + (trab ? _hm(trab) : '') + '</span>' +
        '<b style="color:' + cor + ';text-align:right;">' + txtDif + '</b></div>' + acoes;
      d = _proxDia(d);
    }
    return '<div style="margin-top:10px;"><div style="font-size:.6rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Dia a dia</div>' + rows + '</div>';
  }
  function _btnP(t, on, cor) { return '<button onclick="' + on + '" style="padding:5px 9px;border-radius:7px;border:1px solid ' + cor + '55;background:' + cor + '14;color:' + cor + ';font-family:Outfit,sans-serif;font-size:.66rem;font-weight:700;cursor:pointer;">' + t + '</button>'; }
  function _ultimoPag(f) {
    var ps = Object.values(HR_FUNC.getPagamentos()).filter(function (p) { return p.funcionarioId === f.id && (p.tipo === 'decendio' || !p.tipo); }).sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    return ps[0] || null;
  }
  function _htmlLinha(l, i, av) {
    var f = l.f, s = l.s || {}, nome = _esc(f.nome.split(' ').slice(0, 2).join(' '));
    var per = l.pv.per, k = _chave(l), conf = l.conf || [], grave = conf.some(function (c) { return c.grave; }) || l.erro;
    var aberto = !!_st.aberto[k];
    var ext = (s.valorExtra || 0) + (s.totalAcrescimos || 0) + ((s.totalCreditosHE || 0) - (s.totalPendEntra || 0));
    var desc = (s.deficitRestanteValor || 0) + (s.totalPendSai || 0) + (l.adi || 0) + (l.cre || 0) + (l.pago || 0);
    var e2 = s.totalExtra50Min || 0, e3 = (s.totalExtra100Min || 0) + (s.totalExtra200Min || 0);

    var badge = l.status === 'pago' ? ['✅ Pago', GREEN] : l.status === 'erro' ? ['⚠️ Erro no cálculo', AMBER] : l.status === 'zero' ? ['Nada a pagar', T3] : grave ? ['⛔ Conferir ponto', '#e29a9a'] : ['✓ Pronto pra pagar', GREEN];
    var valor = l.status === 'pago' ? _m(l.pago) : l.status === 'pagar' ? _m(l.valor) : '—';
    var resumo = 'salário ' + _m(s.totalSalario || 0) + (ext > 0.01 ? ' + extras ' + _m(ext) : '') + (desc > 0.01 ? ' − ' + _m(desc) : '');
    var ult = _ultimoPag(f), alertaVar = '';
    if (ult && l.status === 'pagar' && ult.valor > 0) { var r0 = l.valor / ult.valor; if (r0 > 1.35 || r0 < 0.65) alertaVar = 'Valor bem ' + (r0 > 1 ? 'maior' : 'menor') + ' que o último pagamento (' + _m(ult.valor) + ' em ' + _dm(ult.data) + ').'; }

    var head = '<div onclick="HR_FECHAMENTO.abreFecha(' + i + ')" style="display:flex;align-items:center;gap:11px;cursor:pointer;">' +
      '<div style="width:38px;height:38px;border-radius:50%;background:rgba(201,168,76,.14);border:1px solid ' + GOLDB + ';display:flex;align-items:center;justify-content:center;font-weight:800;color:' + GOLD + ';flex-shrink:0;">' + _esc(f.nome.charAt(0)) + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-weight:800;color:' + T1 + ';font-size:.98rem;">' + nome + (f.ativo === 'ferias' ? ' 🌴' : '') + '</div>' +
      '<div style="font-size:.66rem;color:' + badge[1] + ';font-weight:700;margin-top:1px;">' + badge[0] + '</div>' +
      (l.status === 'pagar' ? '<div style="font-size:.62rem;color:' + T3 + ';margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + resumo + '</div>' : '') + '</div>' +
      '<div style="text-align:right;flex-shrink:0;"><div style="font-size:1.15rem;font-weight:800;color:' + (l.status === 'pago' ? GREEN : GOLD) + ';">' + valor + '</div>' +
      '<div style="font-size:.62rem;color:' + T3 + ';">' + (aberto ? 'fechar ▲' : 'ver conta ▼') + '</div></div></div>';

    var corpo = '';
    if (aberto) {
      var subExt = (e2 ? _hm(e2) + ' dobrada (×2)' : '') + (e2 && e3 ? ' + ' : '') + (e3 ? _hm(e3) + ' triplicada (×3)' : '');
      if ((s.deficitAbatidoMin || 0) > 0) subExt += (subExt ? ' · ' : '') + 'já descontei ' + _hm(s.deficitAbatidoMin) + ' de falta/atraso daqui';
      var conta = _linhaConta('Salário do ' + per.label + ' (' + _dm(per.di) + ' a ' + _dm(per.df) + ')', s.totalSalario || 0, '', T1);
      if (ext > 0.01) conta += _linhaConta('Horas extras', ext, '+ ', GREEN, subExt);
      else if ((s.deficitAbatidoMin || 0) > 0) conta += _linhaConta('Horas extras (' + _hm(s.deficitAbatidoMin) + ')', 0, '+ ', T3, 'todas usadas para cobrir faltas/atrasos');
      if ((s.totalPendEntra || 0) > 0.01) conta += _linhaConta('Sobrou do período anterior', s.totalPendEntra, '+ ', GREEN);
      if ((s.deficitRestanteValor || 0) > 0.01) conta += _linhaConta('Faltas/atrasos (' + _hm(s.deficitRestanteMin || 0) + ')', s.deficitRestanteValor, '− ', RED, 'o que não deu para tirar das horas extras');
      if ((s.totalPendSai || 0) > 0.01) conta += _linhaConta('Passado para o próximo pagamento', s.totalPendSai, '− ', RED);
      if (l.adi > 0.01) conta += _linhaConta('Vale / adiantamento', l.adi, '− ', RED);
      if (l.cre > 0.01) conta += _linhaConta('Pago a mais antes', l.cre, '− ', RED);
      if (l.pago > 0.01) conta += _linhaConta('Já pago neste período', l.pago, '− ', RED);
      conta += '<div style="display:flex;justify-content:space-between;padding:7px 0 2px;margin-top:3px;border-top:1px solid ' + GOLDB + ';font-size:.9rem;font-weight:800;"><span style="color:' + T1 + ';">' + (l.status === 'pago' ? 'Falta pagar' : 'Recebe') + '</span><span style="color:' + GOLD + ';">' + _m(l.status === 'pagar' ? l.valor : 0) + '</span></div>';
      var avs = conf.slice(); if (alertaVar) avs.push({ t: alertaVar, grave: false });
      var confHtml = avs.map(function (c) { return '<div style="font-size:.72rem;line-height:1.45;padding:7px 10px;border-radius:9px;margin-top:7px;background:' + (c.grave ? 'rgba(200,92,92,.09)' : 'rgba(224,184,112,.08)') + ';border:1px solid ' + (c.grave ? 'rgba(200,92,92,.35)' : 'rgba(224,184,112,.3)') + ';color:' + (c.grave ? '#e29a9a' : AMBER) + ';">' + (c.grave ? '⛔ ' : 'ℹ️ ') + _esc(c.t) + '</div>'; }).join('');
      var kAviso = k + '|' + (l.status === 'pago' ? 'pago' : 'valor'), enviado = av[kAviso] ? ' ✓' : '';
      var botoes = '';
      if (l.status === 'pagar') botoes += _btn('💳 Pagar ' + _m(l.valor), 'HR_FECHAMENTO.pagarUm(' + i + ')', GREEN, 'rgba(92,184,92,.1)', 'rgba(92,184,92,.45)');
      if (f.pix) botoes += _btn('📋 Copiar Pix', 'HR_FECHAMENTO.copiarPix(' + i + ')', GOLD, 'rgba(201,168,76,.07)', GOLDB);
      if (l.status === 'pagar' || l.status === 'pago') botoes += _btn('💬 ' + (l.status === 'pago' ? 'Mandar comprovante' : 'Mandar a conta pra ele') + enviado, 'HR_FECHAMENTO.avisar(' + i + ')', '#25d366', 'rgba(37,211,102,.07)', 'rgba(37,211,102,.35)');

      var chk = '';
      corpo = '<div style="margin-top:12px;padding:9px 11px;background:rgba(0,0,0,.25);border-radius:10px;">' + conta + '</div>' + confHtml +
        _diaADia(l, l.regsF || []) + '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;">' + botoes + '</div>' +
        '<div style="margin-top:9px;font-size:.66rem;"><a onclick="HR_FECHAMENTO.detalhes(' + i + ')" style="color:' + T3 + ';text-decoration:underline;cursor:pointer;">abrir ficha completa</a></div>';
    } else if (grave || alertaVar) {
      corpo = '<div style="font-size:.68rem;color:' + (grave ? '#e29a9a' : AMBER) + ';margin-top:7px;line-height:1.4;">' + _esc((conf.find(function (c) { return c.grave; }) || { t: alertaVar }).t) + '</div>';
    }
    return '<div class="fech-card" style="background:' + S2 + ';border:1px solid ' + (grave ? 'rgba(200,92,92,.45)' : aberto ? GOLDB : BD) + ';border-radius:14px;padding:12px 14px;' + (l.status === 'pago' || l.status === 'zero' ? 'opacity:.78;' : '') + '">' + head + corpo + '</div>';
  }

  function _render() {
    if (typeof HR_FUNC === 'undefined') return;
    var dados = _linhasAtuais();
    var linhas = _st.linhas = dados.linhas, venc = dados.venc;
    var av = _avisosGet(), regsTodos = Object.values(HR_FUNC.getRegistros());
    // conferências + pendência do mês passado (informativa)
    var mp = new Date(); mp.setDate(1); mp.setMonth(mp.getMonth() - 1);
    var mAnt = mp.getFullYear() + '-' + _p2(mp.getMonth() + 1), ultAnt = new Date(mp.getFullYear(), mp.getMonth() + 1, 0).getDate();
    var mesesPt = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    linhas.forEach(function (l) {
      try { var sa = HR_FUNC.calcSaldoFuncionario(l.f.id, mAnt + '-01', mAnt + '-' + _p2(ultAnt)); l.antPend = (!sa.temCredito && sa.saldo > 5 && regsTodos.some(function (r) { return r.funcionarioId === l.f.id && r.data.slice(0, 7) === mAnt; })) ? sa.saldo : 0; } catch (e) { l.antPend = 0; }
      l.antLbl = mesesPt[+mAnt.slice(5, 7)] + '/' + mAnt.slice(0, 4);
      l.regsF = regsTodos.filter(function (r) { return r.funcionarioId === l.f.id && r.data >= l.pv.per.di && r.data <= l.pv.per.df; });
      l.conf = _conferir(l, l.regsF);
      var k = _chave(l); if (l.conf.some(function (c) { return c.grave; }) && _st.sel[k] && !_st.selManual) _st.sel[k] = false;
    });
    var aPagar = linhas.filter(function (l) { return l.status === 'pagar'; });
    var totAPagar = aPagar.reduce(function (s, l) { return s + l.valor; }, 0);
    var sel = aPagar.filter(function (l) { return !(l.conf || []).some(function (c) { return c.grave; }) && !l.erro; });
    var totSel = sel.reduce(function (s, l) { return s + l.valor; }, 0);
    var nGrave = linhas.filter(function (l) { return (l.conf || []).some(function (c) { return c.grave; }); }).length;
    var nPagos = linhas.filter(function (l) { return l.status === 'pago'; }).length;
    var somaFixo = aPagar.reduce(function (s, l) { return s + (l.s.totalSalario || 0); }, 0);
    var somaExt = aPagar.reduce(function (s, l) { var x = l.s; return s + (x.valorExtra || 0) + (x.totalAcrescimos || 0) + ((x.totalCreditosHE || 0) - (x.totalPendEntra || 0)); }, 0);
    var somaDesc = Math.max(0, somaFixo + somaExt - totAPagar);

    var chips = venc.slice(0, 2).map(function (d) {
      var on = d === _st.corte;
      return '<button onclick="HR_FECHAMENTO.setCorte(\'' + d + '\')" style="padding:8px 13px;border-radius:20px;font-family:Outfit,sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;' +
        (on ? 'background:rgba(201,168,76,.15);border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' : 'background:' + S2 + ';border:1px solid ' + BD + ';color:' + T3 + ';') + '">Dia ' + _dm(d) + '</button>';
    }).join('');

    var passos = '<div style="display:flex;gap:6px;margin-bottom:12px;font-size:.66rem;color:' + T3 + ';">' +
      ['1. Confira os avisos', '2. Pague', '3. Mande a conta'].map(function (t) { return '<div style="flex:1;text-align:center;padding:6px 4px;border:1px solid ' + BD + ';border-radius:8px;">' + t + '</div>'; }).join('') + '</div>';

    var html =
      '<style>@media(min-width:820px){#' + OV + ' .fech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start;}}</style>' +
      '<div style="width:100%;max-width:900px;padding:0 16px;">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">' +
          '<div><div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.35rem;font-weight:800;color:' + T1 + ';">💰 Pagar equipe</div></div>' +
          '<button onclick="HR_FECHAMENTO.fechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.2rem;padding:4px 0 4px 8px;">✕</button>' +
        '</div>' +
        (venc.length > 1 ? '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px;">' + chips + '</div>' : '') +
        '<div style="background:linear-gradient(135deg,' + S2 + ',rgba(201,168,76,.07));border:1px solid ' + GOLDB + ';border-radius:14px;padding:14px 16px;margin-bottom:12px;">' +
          '<div style="font-size:.66rem;color:' + T3 + ';">Pagamento do dia ' + _dm(_st.corte) + '</div>' +
          '<div style="font-size:1.7rem;font-weight:800;color:' + (totAPagar > 0.5 ? GOLD : GREEN) + ';line-height:1.15;">' + (totAPagar > 0.5 ? _m(totAPagar) : '✅ Tudo pago') + '</div>' +
          (totAPagar > 0.5 ? '<div style="font-size:.72rem;color:' + T2 + ';margin-top:4px;">' + aPagar.length + (aPagar.length === 1 ? ' pessoa' : ' pessoas') + ' · salários ' + _m(somaFixo) + ' + extras ' + _m(somaExt) + (somaDesc > 0.01 ? ' − descontos ' + _m(somaDesc) : '') + '</div>' : '') +
          (nPagos ? '<div style="font-size:.66rem;color:' + GREEN + ';margin-top:3px;">' + nPagos + ' já pago' + (nPagos > 1 ? 's' : '') + '</div>' : '') +
        '</div>' +
        (totAPagar > 0.5 ? '<div style="font-size:.7rem;color:' + T3 + ';margin:0 2px 10px;">Toque no nome para ver a conta e o dia a dia.</div>' : '') +
        (nGrave ? '<div style="background:rgba(200,92,92,.08);border:1px solid rgba(200,92,92,.35);border-radius:11px;padding:10px 13px;margin-bottom:12px;font-size:.76rem;color:#e29a9a;line-height:1.5;">⛔ ' + nGrave + (nGrave === 1 ? ' pessoa tem' : ' pessoas têm') + ' ponto faltando — o valor delas pode estar errado. Resolva antes de pagar — ficaram fora do "pagar todos".</div>' : '') +
        (linhas.length === 0 ? '<div style="text-align:center;padding:40px 20px;color:' + T3 + ';font-size:.84rem;">Nenhum funcionário ativo para pagar.</div>'
          : '<div class="fech-grid" style="display:flex;flex-direction:column;gap:10px;">' + linhas.map(function (l, i) { return _htmlLinha(l, i, av); }).join('') + '</div>') +
        '<div style="position:sticky;bottom:0;margin-top:14px;padding:12px 0 6px;background:linear-gradient(180deg,rgba(8,7,4,0),rgba(8,7,4,.97) 30%);">' +
          (aPagar.length ? '<button onclick="HR_FECHAMENTO.pagarSelecionados()" ' + (sel.length ? '' : 'disabled ') + 'style="width:100%;padding:15px;border-radius:12px;background:linear-gradient(135deg,#091a09,#040d04);border:1.5px solid rgba(92,184,92,' + (sel.length ? '.6' : '.2') + ');color:' + (sel.length ? GREEN : T3) + ';font-family:Outfit,sans-serif;font-size:.95rem;font-weight:800;cursor:' + (sel.length ? 'pointer' : 'default') + ';">' +
            (sel.length ? '💳 Pagar os ' + sel.length + ' que estão prontos · ' + _m(totSel) : 'Resolva os avisos para pagar') + '</button>' : '') +
          '<div style="text-align:center;margin-top:10px;font-size:.68rem;"><a onclick="HR_FECHAMENTO.importar()" style="color:' + T3 + ';text-decoration:underline;cursor:pointer;">tem dia no relógio de ponto? importar aqui</a></div>' +
          '<button onclick="HR_FECHAMENTO.fechar()" style="width:100%;margin-top:8px;padding:11px;border-radius:11px;background:transparent;border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;">Fechar</button>' +
        '</div>' +
      '</div>';

    var ov = document.getElementById(OV);
    if (!ov) {
      ov = document.createElement('div');
      ov.id = OV;
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,7,4,.97);display:flex;flex-direction:column;align-items:center;overflow-y:auto;font-family:Outfit,sans-serif;padding:24px 0 40px;';
      document.body.appendChild(ov);
    }
    ov.innerHTML = html;
  }

  // ── ações ───────────────────────────────────────────────────
  function abrir(corte) {
    if (typeof HR_FUNC === 'undefined' || !HR_FUNC._calcValorAPagar) { _toast('Módulo de RH não carregado'); return; }
    if (corte) _st.corte = corte;
    _render();
  }
  function atualizar() { _render(); }
  function abreFecha(i) { var l = _st.linhas[i]; if (!l) return; var k = _chave(l); _st.aberto[k] = !_st.aberto[k]; _render(); }
  function copiarPix(i) { var l = _st.linhas[i]; if (!l || !l.f.pix) return; var t = String(l.f.pix); try { navigator.clipboard.writeText(t).then(function () { _toast('Pix de ' + l.f.nome.split(' ')[0] + ' copiado: ' + t); }, function () { prompt('Copie o Pix:', t); }); } catch (e) { prompt('Copie o Pix:', t); } }
  function fechar() {
    var ov = document.getElementById(OV); if (ov) ov.remove();
    _st.dirty = false;
    try { HR_FUNC.renderPaginaFuncionarios(); } catch (e) {}
  }
  function setCorte(d) { _st.corte = d; _render(); }
  function toggle(i, on) {
    var l = _st.linhas[i]; if (!l) return;
    _st.sel[_chave(l)] = !!on; _st.selManual = true;
    _render();
  }
  function relatorio(i) {
    var l = _st.linhas[i]; if (!l) return;
    if (typeof HR_RELATORIO_PONTO === 'undefined' || !HR_RELATORIO_PONTO.gerarPDF) { _toast('Módulo de relatório não carregado'); return; }
    _st.dirty = true;
    HR_RELATORIO_PONTO.gerarPDF(l.f.id, l.pv.per.di, l.pv.per.df);
  }
  function avisar(i) {
    var l = _st.linhas[i]; if (!l) return;
    _toast('Mandando para ' + l.f.nome.split(' ')[0] + ' pelo bot…');
    _mandarPeloBot(l).then(function () { _avisoSet(_chave(l) + '|' + (l.status === 'pago' ? 'pago' : 'valor')); _toast('✅ Conta enviada no WhatsApp de ' + l.f.nome.split(' ')[0]); _render(); })
      .catch(function () { _avisarWa(l); });
  }
  function _avisarWa(l) {
    var tel = String(l.f.telefone || '').replace(/\D/g, '');
    if (tel.length < 10) { _toast('Sem telefone cadastrado para ' + l.f.nome.split(' ')[0]); return; }
    window.open('https://wa.me/55' + tel + '?text=' + encodeURIComponent(_msg(l)), '_blank');
    _avisoSet(_chave(l) + '|' + (l.status === 'pago' ? 'pago' : 'valor'));
    _render();
  }
  function corrigir(i) {
    var l = _st.linhas[i]; if (!l) return;
    _st.dirty = true;
    HR_FUNC.abrirHistorico(l.f.id);
  }
  function detalhes(i) {
    var l = _st.linhas[i]; if (!l) return;
    _st.dirty = true;
    HR_FUNC.abrirDetalhesFuncionario(l.f.id);
  }
  function importar() {
    if (typeof HR_IMPORT === 'undefined' || !HR_IMPORT.abrirImportacao) { _toast('Módulo de importação não carregado'); return; }
    _st.dirty = true;
    HR_IMPORT.abrirImportacao();
  }


  // ── v5: resolver dia sem ponto aqui mesmo ──
  function _hm2min(t) { var m = /^(\d{1,2})[:h]?(\d{2})?$/.exec(String(t || '').trim()); return m ? (+m[1]) * 60 + (+(m[2] || 0)) : NaN; }
  function _min2hm(x) { return _p2(Math.floor(x / 60)) + ':' + _p2(x % 60); }

  // v6: horário de costume do funcionário (mediana dos últimos 45 dias) — base para completar batida esquecida
  function _costume(fid) {
    var regs = {}; try { regs = HR_FUNC.getRegistros() || {}; } catch (e) {}
    var lim = new Date(); lim.setDate(lim.getDate() - 45); var limI = _iso(lim), col = { e: [], ai: [], af: [], s: [] };
    Object.keys(regs).forEach(function (k) { var r = regs[k]; if (!r || String(r.funcionarioId) !== String(fid) || r.data < limI || r.tipo === 'falta' || r.tipo === 'abonado') return;
      var e = _hm2min(r.entrada), ai = _hm2min(r.saidaAlmoco), af = _hm2min(r.voltaAlmoco), sa = _hm2min(r.saida);
      if (e >= 300 && e <= 600) col.e.push(e); if (ai >= 600 && ai <= 810 && af > ai) { col.ai.push(ai); col.af.push(af); } if (sa >= 900 && sa <= 1200) col.s.push(sa); });
    function med(a, pad) { if (!a.length) return pad; a.sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
    return { e: med(col.e, 420), ai: med(col.ai, 720), af: med(col.af, 800), s: med(col.s, 1020), n: col.e.length };
  }
  function _manhaEsquecida(r, esp) { var e = _hm2min(r && r.entrada); return !!r && esp >= 420 && e >= 735 && e <= 885 && !r.saidaAlmoco; }
  function diaCompletarManha(fid, d) {
    var regs = HR_FUNC.getRegistros(), r = null; Object.keys(regs).some(function (k) { var g = regs[k]; if (g && String(g.funcionarioId) === String(fid) && g.data === d) { r = g; return true; } });
    if (!r) return;
    var c = _costume(fid), volta = _hm2min(r.entrada), sa = _hm2min(r.saida);
    var t = prompt('Em ' + _dm(d) + ' a 1ª batida foi ' + r.entrada + ' (volta do almoço).\nQue horas ele chegou e saiu pro almoço?\n(sugestão pelo costume dele)', _min2hm(c.e) + ' ' + _min2hm(Math.min(c.ai, volta - 30)));
    if (t == null) return;
    var p = String(t).trim().split(/[\s,;–-]+/), e = _hm2min(p[0]), ai = _hm2min(p[1]);
    if (!(e >= 0) || !(ai > e) || !(volta > ai) || !(sa > volta)) { _toast('Não entendi. Ex.: 07:00 12:00'); return; }
    var alm = volta - ai, cc = (typeof HR_IMPORT !== 'undefined' && HR_IMPORT._calcDia) ? HR_IMPORT._calcDia(e, sa, d, alm, fid) : { trab: sa - e - alm, extra: 0 };
    var campos = { entrada: _min2hm(e), saidaAlmoco: _min2hm(ai), voltaAlmoco: _min2hm(volta), saida: _min2hm(sa), semAlmocoConfirmado: false, horas: +(cc.trab / 60).toFixed(4), extra: +((cc.extra || 0) / 60).toFixed(4), tipo: r.tipo === 'falta' ? 'normal' : (r.tipo || 'normal'), observacao: 'Manhã completada no fechamento (esqueceu de bater)' };
    if (_gravarDia(fid, d, campos)) { _toast('✓ ' + _dm(d) + ': ' + campos.entrada + '–' + campos.saidaAlmoco + ' / ' + campos.voltaAlmoco + '–' + campos.saida); _render(); }
  }
  function _gravarDia(fid, d, campos) {
    var regs = HR_FUNC.getRegistros(), existe = null;
    Object.keys(regs).some(function (k) { var g = regs[k]; if (g && String(g.funcionarioId) === String(fid) && g.data === d) { existe = g; return true; } });
    var reg = existe || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), funcionarioId: fid, data: d, destinoExtra: 'pagar', producao: '', instalacao: '', ieo: '', origem: 'manual', loteId: 'fech_' + d, criadoEm: new Date().toISOString() };
    Object.keys(campos).forEach(function (k) { reg[k] = campos[k]; });
    reg.atualizadoEm = new Date().toISOString();
    regs[reg.id] = reg;
    try { localStorage.setItem('hr_registros', JSON.stringify(regs)); } catch (e) { _toast('Não consegui salvar: ' + e.message); return false; }
    return true;
  }
  function diaTrabalhou(fid, d, esp) {
    var cst = _costume(fid), sug = esp <= 300 ? _min2hm(cst.e) + '-' + _min2hm(cst.e + 240) : _min2hm(cst.e) + '-' + _min2hm(cst.s); // v6: pelo costume dele
    var t = prompt('Que horas entrou e saiu em ' + _dm(d) + '?\n(ex.: ' + sug + ' — em dia cheio desconto 1h20 de almoço)', sug);
    if (t == null) return;
    var p = String(t).replace(/\s/g, '').split(/[-–a]+/), e = _hm2min(p[0]), sa = _hm2min(p[1]);
    if (!(e >= 0) || !(sa > e)) { _toast('Horário não entendi. Use assim: ' + sug); return; }
    var alm = (sa - e) > 360 ? 80 : 0, c = (typeof HR_IMPORT !== 'undefined' && HR_IMPORT._calcDia) ? HR_IMPORT._calcDia(e, sa, d, alm, fid) : { trab: sa - e - alm, extra: 0 };
    var campos = { entrada: _min2hm(e), saida: _min2hm(sa), saidaAlmoco: alm ? '12:00' : '', voltaAlmoco: alm ? _min2hm(720 + alm) : '', semAlmocoConfirmado: !alm, horas: +(c.trab / 60).toFixed(4), extra: +((c.extra || 0) / 60).toFixed(4), tipo: 'normal', tipoExtra: 'normal', observacao: 'Lançado no fechamento (trabalhou, sem ponto)' };
    if (_gravarDia(fid, d, campos)) { _toast('✓ ' + _dm(d) + ' lançado: ' + campos.entrada + '–' + campos.saida); _render(); }
  }
  function diaMarcar(fid, d, tipo) {
    var txt = tipo === 'falta' ? 'Confirmar FALTA em ' + _dm(d) + '? (desconta o dia)' : 'Marcar ' + _dm(d) + ' como ATESTADO? (não desconta)';
    if (!confirm(txt)) return;
    var campos = { tipo: tipo, entrada: '', saida: '', saidaAlmoco: '', voltaAlmoco: '', horas: 0, extra: 0, tipoExtra: 'normal', observacao: tipo === 'falta' ? 'Falta confirmada no fechamento' : 'Atestado (fechamento)' };
    if (tipo === 'abonado') campos.motivoAbono = 'atestado';
    if (_gravarDia(fid, d, campos)) { _toast('✓ ' + _dm(d) + (tipo === 'falta' ? ': falta confirmada' : ': atestado lançado')); _render(); }
  }
  // "Mandar a conta": pelo bot, já com o PDF do ponto (cai no WhatsApp dele); sem bot, abre o WhatsApp com o texto
  function _mandarPeloBot(l) {
    if (!window.HRPonto || !HRPonto.enviarPdfsBot) return Promise.reject(new Error('sem bot'));
    var qual = _hojeISO() <= l.pv.per.df ? 'atual' : 'anterior';
    return HRPonto.enviarPdfsBot({ forcar: true, qual: qual, funcId: l.f.id }).then(function (res) {
      var r = res && res[l.f.id]; if (!r || /^erro|sem registros/.test(r)) throw new Error(r || 'não enviou'); return r;
    });
  }

  // ── pagamento (com confirmação) ─────────────────────────────
  function pagarUm(i) {
    var l = _st.linhas[i]; if (!l || l.status !== 'pagar') return;
    _confirmar([l]);
  }
  function pagarSelecionados() {
    var itens = _st.linhas.filter(function (l) { return l.status === 'pagar' && !(l.conf || []).some(function (c) { return c.grave; }) && !l.erro; });
    if (!itens.length) { _toast('Ninguém pronto para pagar'); return; }
    _confirmar(itens);
  }
  function _confirmar(itens) {
    var old = document.getElementById(OV_CONF); if (old) old.remove();
    var tot = itens.reduce(function (s, l) { return s + l.valor; }, 0);
    var temProb = itens.some(_problema);
    var ids = itens.map(function (l) { return _st.linhas.indexOf(l); });
    var ov = document.createElement('div');
    ov.id = OV_CONF;
    ov.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Outfit,sans-serif;';
    ov.innerHTML =
      '<div style="width:100%;max-width:460px;max-height:90vh;overflow-y:auto;background:#12100a;border:1px solid ' + GOLDB + ';border-radius:16px;padding:18px;">' +
        '<div style="font-size:1.02rem;font-weight:800;color:' + T1 + ';margin-bottom:4px;">Confirmar pagamento</div>' +
        '<div style="font-size:.72rem;color:' + T3 + ';margin-bottom:12px;line-height:1.5;">Registra ' + itens.length + (itens.length === 1 ? ' pagamento' : ' pagamentos') + ' e lança nas Finanças, com a data do vencimento de cada período.</div>' +
        itens.map(function (l) {
          return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid ' + BD + ';font-size:.82rem;">' +
            '<span style="color:' + T1 + ';">' + _esc(l.f.nome.split(' ').slice(0, 2).join(' ')) + ' <span style="color:' + T3 + ';font-size:.66rem;">' + l.pv.per.label + '</span></span>' +
            '<b style="color:' + GOLD + ';white-space:nowrap;">' + _m(l.valor) + '</b></div>';
        }).join('') +
        '<div style="display:flex;justify-content:space-between;padding:11px 0 4px;border-top:1px solid ' + GOLDB + ';font-size:.9rem;font-weight:800;color:' + T1 + ';"><span>Total</span><span style="color:' + GREEN + ';">' + _m(tot) + '</span></div>' +
        (temProb ? '<div style="font-size:.7rem;color:' + AMBER + ';margin:8px 0;line-height:1.5;">⚠️ Tem gente aqui com problema no ponto. Só confirme se já conferiu o valor.</div>' : '') +
        '<div style="margin:12px 0 14px;"><label style="font-size:.62rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.08em;">Forma de pagamento</label>' +
        '<select id="fechForma" style="width:100%;margin-top:5px;padding:11px;border-radius:10px;border:1px solid ' + BD + ';background:#1a1006;color:' + T1 + ';font-family:Outfit,sans-serif;font-size:.88rem;">' +
          '<option value="pix">📱 PIX</option><option value="dinheiro">💵 Dinheiro</option><option value="ted">🏦 TED</option></select></div>' +
        '<label style="display:flex;gap:8px;align-items:center;font-size:.76rem;color:' + T2 + ';margin:-4px 0 12px;cursor:pointer;"><input id="fechAvisar" type="checkbox" checked style="width:19px;height:19px;accent-color:#25d366;">Mandar a conta no WhatsApp de cada um (pelo bot)</label>' +
        '<button id="fechOk" onclick="HR_FECHAMENTO._executar([' + ids.join(',') + '])" style="width:100%;padding:13px;border-radius:11px;background:linear-gradient(135deg,#091a09,#040d04);border:1.5px solid rgba(92,184,92,.5);color:' + GREEN + ';font-family:Outfit,sans-serif;font-size:.92rem;font-weight:800;cursor:pointer;margin-bottom:8px;">✅ Confirmar pagamento</button>' +
        '<button onclick="document.getElementById(\'' + OV_CONF + '\').remove()" style="width:100%;padding:11px;border-radius:11px;background:transparent;border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;">Cancelar</button>' +
      '</div>';
    document.body.appendChild(ov);
  }

  function _executar(idx) {
    if (_st.ocupado) return;
    _st.ocupado = true;
    var forma = (document.getElementById('fechForma') || {}).value || 'pix';
    var avisarBot = !!(document.getElementById('fechAvisar') || {}).checked, pagos = [];
    var regs = Object.values(HR_FUNC.getRegistros());
    var ok = 0, pulados = 0, erros = [], total = 0;
    idx.forEach(function (i) {
      var antigo = _st.linhas[i]; if (!antigo) return;
      // recalcula na hora: nunca paga um valor "velho" da tela
      var l = _calc(antigo.f, _st.corte, regs);
      if (!l || l.status !== 'pagar') { pulados++; return; }
      var valor = Math.round(l.valor * 100) / 100;
      var per = l.pv.per;
      var r = HR_FUNC.registrarPagamento({
        funcionarioId: l.f.id, data: l.pv.due, valor: valor, tipo: 'decendio', forma: forma,
        obs: 'Fechamento ' + per.label + ' (' + _dm(per.di) + ' a ' + _dm(per.df) + ')', notificar: false
      });
      if (r && r.ok) { ok++; total += valor; delete _st.sel[_chave(l)]; pagos.push(l); }
      else erros.push(l.f.nome.split(' ')[0] + ': ' + ((r && r.erro) || 'falhou'));
    });
    _st.ocupado = false;
    var conf = document.getElementById(OV_CONF); if (conf) conf.remove();
    _render();
    try { HR_FUNC.renderPaginaFuncionarios(); } catch (e) {}
    var msg = '✅ ' + ok + (ok === 1 ? ' pagamento registrado' : ' pagamentos registrados') + ' · ' + _m(total);
    if (pulados) msg += ' · ' + pulados + ' já estava(m) pago(s)';
    if (erros.length) msg += ' · ⚠️ ' + erros.join('; ');
    _toast(msg);
    if (avisarBot && pagos.length) { // um de cada vez (o PDF é gerado aqui no celular)
      var seq = Promise.resolve(), env = 0;
      pagos.forEach(function (l) { seq = seq.then(function () { return _mandarPeloBot(l).then(function () { env++; _avisoSet(_chave(l) + '|pago'); }).catch(function () {}); }); });
      seq.then(function () { _toast('💬 Conta enviada para ' + env + ' de ' + pagos.length + ' no WhatsApp' + (env < pagos.length ? ' — os outros: use "Mandar comprovante"' : '')); _render(); });
    }
  }

  // Quando o usuário volta do relatório / importação / histórico, atualiza a lista
  try {
    var _t = null;
    new MutationObserver(function () {
      if (!_st.dirty || !document.getElementById(OV)) return;
      clearTimeout(_t);
      _t = setTimeout(function () {
        var aberto = document.getElementById('hrPontoPDFOverlay') || document.getElementById('hrFuncDetalhes') || document.getElementById('hrHistorico');
        if (aberto) return;
        if (document.getElementById(OV)) _render();
      }, 400);
    }).observe(document.body, { childList: true });
  } catch (e) {}

  return {
    abrir: abrir, atualizar: atualizar, abreFecha: abreFecha, copiarPix: copiarPix, diaTrabalhou: diaTrabalhou, diaCompletarManha: diaCompletarManha, diaMarcar: diaMarcar, fechar: fechar, setCorte: setCorte, toggle: toggle,
    relatorio: relatorio, avisar: avisar, corrigir: corrigir, detalhes: detalhes, importar: importar,
    pagarUm: pagarUm, pagarSelecionados: pagarSelecionados, _executar: _executar
  };
})();
