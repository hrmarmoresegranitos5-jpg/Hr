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
  var _st = { corte: null, sel: {}, linhas: [], ocupado: false, dirty: false };

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
    var ext = (s.valorExtra || 0) + (s.totalAcrescimos || 0) + (s.totalCreditosHE || 0);
    if (ext > 0.01) t += '• Horas extras: +' + _m(ext) + '\n';
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

  function _htmlLinha(l, i, av) {
    var f = l.f, nome = _esc(f.nome.split(' ').slice(0, 2).join(' '));
    var per = l.pv.per, k = _chave(l), prob = _problema(l);
    var emFerias = f.ativo === 'ferias';

    var chk = (l.status === 'pagar')
      ? '<input type="checkbox" ' + (_st.sel[k] ? 'checked' : '') + ' onchange="HR_FECHAMENTO.toggle(' + i + ',this.checked)" style="width:22px;height:22px;accent-color:#5cb85c;flex-shrink:0;margin-top:2px;">'
      : '<span style="width:22px;flex-shrink:0;"></span>';

    var vTxt, vCor, vRot;
    if (l.status === 'pagar') { vTxt = _m(l.valor); vCor = GOLD; vRot = l.pago > 0.01 ? 'falta pagar' : 'a pagar'; }
    else if (l.status === 'pago') { vTxt = '✅ Pago'; vCor = GREEN; vRot = _m(l.pago); }
    else if (l.status === 'erro') { vTxt = '⚠️ erro'; vCor = AMBER; vRot = 'confira manualmente'; }
    else { vTxt = '—'; vCor = T3; vRot = 'nada a pagar'; }

    var partes = ['Fixo ' + _m(l.s.totalSalario)];
    var ext = (l.s.valorExtra || 0) + (l.s.totalAcrescimos || 0) + (l.s.totalCreditosHE || 0);
    if (ext > 0.01) partes.push('Extras +' + _m(ext));
    if ((l.s.deficitRestanteValor || 0) > 0.01) partes.push('Faltas −' + _m(l.s.deficitRestanteValor));
    if (l.adi > 0.01) partes.push('Vale −' + _m(l.adi));
    if (l.cre > 0.01) partes.push('Desc. pago a mais −' + _m(l.cre));
    if (l.pago > 0.01 && l.status !== 'pago') partes.push('Já pago −' + _m(l.pago));

    var avisos = '';
    if (l.semPonto) avisos += '<div style="font-size:.7rem;color:' + AMBER + ';margin-top:6px;line-height:1.45;">⚠️ Nenhum ponto lançado neste período — o valor pode estar errado. Importe ou lance o ponto antes de pagar.</div>';
    if (l.semSaida > 0) avisos += '<div style="font-size:.7rem;color:' + AMBER + ';margin-top:6px;line-height:1.45;">⚠️ ' + l.semSaida + ' dia' + (l.semSaida > 1 ? 's' : '') + ' com entrada e sem saída — confira o ponto.</div>';

    var kAviso = k + '|' + (l.status === 'pago' ? 'pago' : 'valor');
    var enviado = av[kAviso] ? ' <span style="color:' + GREEN + ';">✓</span>' : '';
    var botoes = _btn('📄 Relatório', 'HR_FECHAMENTO.relatorio(' + i + ')');
    if (l.status === 'pagar' || l.status === 'pago')
      botoes += _btn('💬 ' + (l.status === 'pago' ? 'Avisar pago' : 'Avisar valor') + enviado, 'HR_FECHAMENTO.avisar(' + i + ')', '#25d366', 'rgba(37,211,102,.07)', 'rgba(37,211,102,.35)');
    if (prob) botoes += _btn('🛠 Corrigir ponto', 'HR_FECHAMENTO.corrigir(' + i + ')', AMBER, 'rgba(224,184,112,.07)', 'rgba(224,184,112,.35)');
    if (l.status === 'pagar')
      botoes += _btn('💳 Pagar', 'HR_FECHAMENTO.pagarUm(' + i + ')', GREEN, 'rgba(92,184,92,.09)', 'rgba(92,184,92,.4)');

    return '<div class="fech-card" style="background:' + S2 + ';border:1px solid ' + (prob ? 'rgba(224,184,112,.45)' : (l.status === 'pagar' ? 'rgba(201,168,76,.35)' : BD)) +
      ';border-radius:14px;padding:13px 14px;' + (l.status === 'pago' || l.status === 'zero' ? 'opacity:.82;' : '') + '">' +
      '<div style="display:flex;gap:11px;align-items:flex-start;">' + chk +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;color:' + T1 + ';font-size:.95rem;cursor:pointer;" onclick="HR_FECHAMENTO.detalhes(' + i + ')">' + nome + (emFerias ? ' 🌴' : '') + '</div>' +
          '<div style="font-size:.66rem;color:' + T3 + ';margin-top:1px;">' + per.label + ' · ' + _dm(per.di) + ' a ' + _dm(per.df) + ' · ' + (l.s.diasTrabalhados || 0) + ' dias' + (l.s.totalHoras ? ' · ' + Math.round(l.s.totalHoras) + 'h' : '') + '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          '<div style="font-size:1.05rem;font-weight:800;color:' + vCor + ';line-height:1.15;">' + vTxt + '</div>' +
          '<div style="font-size:.6rem;color:' + T3 + ';">' + vRot + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:.68rem;color:' + T3 + ';margin-top:8px;line-height:1.5;">' + partes.join(' · ') + '</div>' +
      avisos +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;">' + botoes + '</div>' +
    '</div>';
  }

  function _render() {
    if (typeof HR_FUNC === 'undefined') return;
    var dados = _linhasAtuais();
    var linhas = _st.linhas = dados.linhas, venc = dados.venc;
    var av = _avisosGet();

    var aPagar = linhas.filter(function (l) { return l.status === 'pagar'; });
    var totAPagar = aPagar.reduce(function (s, l) { return s + l.valor; }, 0);
    var sel = aPagar.filter(function (l) { return _st.sel[_chave(l)]; });
    var totSel = sel.reduce(function (s, l) { return s + l.valor; }, 0);
    var nProb = linhas.filter(_problema).length;
    var nPagos = linhas.filter(function (l) { return l.status === 'pago'; }).length;

    var chips = venc.map(function (d) {
      var on = d === _st.corte;
      return '<button onclick="HR_FECHAMENTO.setCorte(\'' + d + '\')" style="padding:8px 13px;border-radius:20px;font-family:Outfit,sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;' +
        (on ? 'background:rgba(201,168,76,.15);border:1.5px solid ' + GOLDB + ';color:' + GOLD + ';' : 'background:' + S2 + ';border:1px solid ' + BD + ';color:' + T3 + ';') + '">' + _dm(d) + '</button>';
    }).join('');

    var html =
      '<style>@media(min-width:820px){#' + OV + ' .fech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start;}#' + OV + ' .fech-grid>.fech-card{margin-bottom:0!important;}}</style>' +
      '<div style="width:100%;max-width:900px;padding:0 16px;">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">' +
          '<div><div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.3rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">Fechar pagamento</div>' +
          '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">Pagamento do dia ' + _dm(_st.corte) + ' · confira, avise e pague</div></div>' +
          '<button onclick="HR_FECHAMENTO.fechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
        '</div>' +

        (venc.length > 1 ? '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px;">' + chips + '</div>' : '') +

        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;padding:13px 15px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<div><div style="font-size:.62rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.08em;">Total a pagar</div>' +
          '<div style="font-size:1.4rem;font-weight:800;color:' + (totAPagar > 0.5 ? GOLD : GREEN) + ';line-height:1.1;">' + _m(totAPagar) + '</div>' +
          '<div style="font-size:.66rem;color:' + T3 + ';margin-top:2px;">' + aPagar.length + (aPagar.length === 1 ? ' pessoa' : ' pessoas') + (nPagos ? ' · ' + nPagos + ' já pago' + (nPagos > 1 ? 's' : '') : '') + '</div></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            _btn('📥 Importar ponto do relógio', 'HR_FECHAMENTO.importar()', GREEN, 'rgba(92,184,92,.07)', 'rgba(92,184,92,.35)') +
            _btn('↻ Atualizar', 'HR_FECHAMENTO.atualizar()') +
          '</div>' +
        '</div>' +

        (nProb ? '<div style="background:rgba(224,184,112,.08);border:1px solid rgba(224,184,112,.35);border-radius:11px;padding:10px 13px;margin-bottom:12px;font-size:.74rem;color:' + AMBER + ';line-height:1.5;">⚠️ ' + nProb + (nProb === 1 ? ' pessoa com problema' : ' pessoas com problema') + ' no ponto — elas aparecem primeiro e não vêm marcadas para pagar.</div>' : '') +

        (linhas.length === 0
          ? '<div style="text-align:center;padding:40px 20px;color:' + T3 + ';font-size:.84rem;">Nenhum funcionário ativo para pagar.</div>'
          : '<div class="fech-grid" style="display:flex;flex-direction:column;gap:10px;">' + linhas.map(function (l, i) { return _htmlLinha(l, i, av); }).join('') + '</div>') +

        '<div style="position:sticky;bottom:0;margin-top:14px;padding:12px 0 6px;background:linear-gradient(180deg,rgba(8,7,4,0),rgba(8,7,4,.97) 30%);">' +
          (aPagar.length
            ? '<button onclick="HR_FECHAMENTO.pagarSelecionados()" ' + (sel.length ? '' : 'disabled ') + 'style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#091a09,#040d04);border:1.5px solid rgba(92,184,92,.5);color:' + GREEN + ';font-family:Outfit,sans-serif;font-size:.92rem;font-weight:800;cursor:pointer;' + (sel.length ? '' : 'opacity:.45;') + '">' +
                (sel.length ? '✅ Marcar ' + sel.length + (sel.length === 1 ? ' selecionado' : ' selecionados') + ' como pagos · ' + _m(totSel) : 'Marque quem você já pagou')
              + '</button>'
            : '') +
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
    ov.innerHTML = html;    // mesmo elemento → mantém a posição da rolagem
  }

  // ── ações ───────────────────────────────────────────────────
  function abrir(corte) {
    if (typeof HR_FUNC === 'undefined' || !HR_FUNC._calcValorAPagar) { _toast('Módulo de RH não carregado'); return; }
    if (corte) _st.corte = corte;
    _render();
  }
  function atualizar() { _render(); }
  function fechar() {
    var ov = document.getElementById(OV); if (ov) ov.remove();
    _st.dirty = false;
    try { HR_FUNC.renderPaginaFuncionarios(); } catch (e) {}
  }
  function setCorte(d) { _st.corte = d; _render(); }
  function toggle(i, on) {
    var l = _st.linhas[i]; if (!l) return;
    _st.sel[_chave(l)] = !!on;
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

  // ── pagamento (com confirmação) ─────────────────────────────
  function pagarUm(i) {
    var l = _st.linhas[i]; if (!l || l.status !== 'pagar') return;
    _confirmar([l]);
  }
  function pagarSelecionados() {
    var itens = _st.linhas.filter(function (l) { return l.status === 'pagar' && _st.sel[_chave(l)]; });
    if (!itens.length) { _toast('Marque quem você quer pagar'); return; }
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
        '<button id="fechOk" onclick="HR_FECHAMENTO._executar([' + ids.join(',') + '])" style="width:100%;padding:13px;border-radius:11px;background:linear-gradient(135deg,#091a09,#040d04);border:1.5px solid rgba(92,184,92,.5);color:' + GREEN + ';font-family:Outfit,sans-serif;font-size:.92rem;font-weight:800;cursor:pointer;margin-bottom:8px;">✅ Confirmar pagamento</button>' +
        '<button onclick="document.getElementById(\'' + OV_CONF + '\').remove()" style="width:100%;padding:11px;border-radius:11px;background:transparent;border:1px solid ' + BD2 + ';color:' + T2 + ';font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;">Cancelar</button>' +
      '</div>';
    document.body.appendChild(ov);
  }

  function _executar(idx) {
    if (_st.ocupado) return;
    _st.ocupado = true;
    var forma = (document.getElementById('fechForma') || {}).value || 'pix';
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
      if (r && r.ok) { ok++; total += valor; delete _st.sel[_chave(l)]; }
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
    abrir: abrir, atualizar: atualizar, fechar: fechar, setCorte: setCorte, toggle: toggle,
    relatorio: relatorio, avisar: avisar, corrigir: corrigir, detalhes: detalhes, importar: importar,
    pagarUm: pagarUm, pagarSelecionados: pagarSelecionados, _executar: _executar
  };
})();
