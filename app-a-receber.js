// ═══════════════════════════════════════════════════════════════════
// app-a-receber.js — Cliente recebeu e não pagou: "A Receber" + multa e juros
// Carregar DEPOIS de app-agenda-v2.js.
//
// Fluxo:
//  1. Marcou "Entregue" → abre a tela de receber (já existia).
//  2. Cliente não pagou → botão "Cliente não pagou agora" → o app PERGUNTA
//     se pode lançar como "a receber" (com vencimento).
//  3. Depois do vencimento o app conta MULTA (uma vez) + JUROS (por dia).
//  4. Tela "💸 A Receber": todos os clientes devendo, valor atualizado hoje,
//     botão Receber, Cobrar no WhatsApp, mudar vencimento, perdoar encargos.
//
// Os dados ficam dentro do próprio serviço (j.fiado) — sincroniza junto com a agenda.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var PADRAO = { multaPct: 2, jurosMesPct: 1, diasPrazo: 7, carenciaDias: 0 };

  // ── utilidades ────────────────────────────────────────────────────
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function hoje() { return iso(new Date()); }
  function mkData(s) { var a = String(s).split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function somaDias(s, n) { var d = mkData(s); d.setDate(d.getDate() + n); return iso(d); }
  function diff(a, b) { return Math.round((mkData(a) - mkData(b)) / 86400000); } // a - b em dias
  function r2(n) { return Math.round(((+n || 0) + 1e-9) * 100) / 100; }
  function brl(n) { return (typeof fm === 'function') ? fm(n) : (+n || 0).toFixed(2).replace('.', ','); }
  function dm(s) { if (!s) return ''; var p = String(s).split('-'); return p[2] + '/' + p[1]; }
  function dmy(s) { if (!s) return ''; var p = String(s).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toastS(m) { if (typeof toast === 'function') toast(m); }
  function num(v) {
    var raw = String(v == null ? '' : v).trim().replace(/[^\d,.-]/g, '');
    if (raw.indexOf(',') > -1) raw = raw.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }
  function achaJob(id) { return (DB.j || []).find(function (x) { return String(x.id) === String(id); }); }
  function achaOrc(j) { return j && j.qId ? (DB.q || []).find(function (o) { return String(o.id) === String(j.qId); }) : null; }
  function redesenha() { if (typeof renderAg === 'function') { try { renderAg(); } catch (e) {} } }

  // ── configuração (multa / juros / prazo padrão) ───────────────────
  function cfg() {
    var c = (typeof CFG !== 'undefined' && CFG && CFG.cobranca) || {};
    return {
      multaPct: isFinite(c.multaPct) && c.multaPct !== '' && c.multaPct != null ? +c.multaPct : PADRAO.multaPct,
      jurosMesPct: isFinite(c.jurosMesPct) && c.jurosMesPct !== '' && c.jurosMesPct != null ? +c.jurosMesPct : PADRAO.jurosMesPct,
      diasPrazo: c.diasPrazo > 0 ? +c.diasPrazo : PADRAO.diasPrazo,
      carenciaDias: isFinite(c.carenciaDias) && c.carenciaDias !== '' && c.carenciaDias != null && c.carenciaDias >= 0 ? Math.round(+c.carenciaDias) : PADRAO.carenciaDias
    };
  }
  function salvaCfg(c) {
    if (typeof CFG === 'undefined' || !CFG) return;
    CFG.cobranca = c;
    if (typeof svCFG === 'function') { try { svCFG(); } catch (e) {} }
  }

  // ── cálculo: multa + juros ────────────────────────────────────────
  // Multa: % única sobre o que está em aberto, a partir do dia seguinte ao vencimento.
  // Juros: % ao mês (simples), proporcional por dia (÷30), sobre o que está em aberto.
  // Quando entra pagamento parcial / perdão, o que já foi apurado é "congelado" e o juros
  // novo passa a contar só sobre o saldo que sobrou.
  function calc(j, ref) {
    ref = ref || hoje();
    var f = j && j.fiado;
    var rest = Math.max(0, r2((j.value || 0) - (j.pago || 0)));
    var out = { rest: rest, dias: 0, multa: 0, juros: 0, enc: 0, total: rest, atrasado: false, jurosDia: 0, naCarencia: false };
    if (!f || !f.venc) return out;
    var car = f.carencia || 0;               // dias de tolerância depois do vencimento (sem multa nem juros)
    var diasVenc = ref > f.venc ? diff(ref, f.venc) : 0;
    var atras = diasVenc > car;
    out.atrasado = atras;
    out.naCarencia = diasVenc > 0 && !atras;
    out.dias = atras ? diasVenc : 0;
    out.jurosDia = r2(rest * (f.jurosMesPct || 0) / 100 / 30);
    var multa = (f.multaCobrada != null) ? f.multaCobrada : (atras ? r2(rest * (f.multaPct || 0) / 100) : 0);
    var dj = 0;
    if (atras) dj = (f.desde && f.desde > f.venc) ? Math.max(0, diff(ref, f.desde)) : Math.max(0, diasVenc - car);
    var juros = r2((f.jurosAcum || 0) + rest * ((f.jurosMesPct || 0) / 100 / 30) * dj);
    out.multa = multa;
    out.juros = juros;
    out.enc = Math.max(0, r2(multa + juros - (f.encPago || 0) - (f.perdoado || 0)));
    out.total = r2(rest + out.enc);
    return out;
  }
  function congela(j, ref) {
    var f = j.fiado; if (!f) return;
    var c = calc(j, ref);
    if (c.atrasado) {
      f.multaCobrada = c.multa; f.jurosAcum = c.juros; f.desde = ref;
    }
  }
  function emAberto(j) { return !!(j && j.fiado && ((j.value || 0) - (j.pago || 0)) > 0.005); }

  // ── janelinha (bottom sheet) ──────────────────────────────────────
  var ID = 'hrRecModal';
  function fecha() { var m = document.getElementById(ID); if (m && m.parentNode) m.parentNode.removeChild(m); }
  function sheet(html, opts) {
    fecha();
    opts = opts || {};
    var m = document.createElement('div');
    m.id = ID;
    m.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="background:var(--bg,#0d0d12);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:' + (opts.alto || '90vh') + ';overflow-y:auto;padding:14px 18px 26px;border-top:2px solid var(--gold3,#C9A84C);">' +
      '<div style="width:38px;height:4px;background:var(--bd2);border-radius:3px;margin:0 auto 14px;"></div>' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m && !opts.fixo) fecha(); });
    document.body.appendChild(m);
    return m;
  }
  var LBL = 'display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;color:var(--t3);margin-bottom:6px;';
  var BTN_OK = 'width:100%;padding:14px;border-radius:12px;border:none;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.92rem;cursor:pointer;font-family:inherit;';
  var BTN_NO = 'width:100%;margin-top:8px;padding:11px;border:none;background:transparent;color:var(--t3);font-size:.8rem;cursor:pointer;font-family:inherit;';
  var BTN_LN = 'width:100%;margin-top:8px;padding:12px;border-radius:12px;border:1px dashed var(--gold3,#C9A84C);background:transparent;color:var(--gold,#C9A84C);font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit;';
  var CHIP = 'flex:1;min-width:22%;padding:10px 6px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.74rem;border:1px solid var(--bd2);background:var(--s2);color:var(--tx);font-weight:600;';
  var INPUT = 'width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd2);background:var(--s2);color:var(--tx);font-size:.9rem;box-sizing:border-box;font-family:inherit;';

  function valorBox(id, valor) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:0 14px;border-radius:10px;border:1px solid var(--bd2);background:var(--s2);">' +
      '<span style="color:var(--t3);font-weight:700;">R$</span>' +
      '<input id="' + id + '" type="text" inputmode="decimal" value="' + (Math.round(valor * 100) / 100).toFixed(2).replace('.', ',') + '" style="flex:1;min-width:0;width:auto!important;padding:13px 0!important;border:none!important;background:transparent!important;box-shadow:none!important;color:var(--tx);font-size:1.05rem;font-weight:800;font-family:inherit;"></div>';
  }
  function resumoBox(cols) {
    return '<div style="display:flex;gap:12px;flex-wrap:wrap;background:var(--s2);border:1px solid var(--bd2);border-radius:14px;padding:12px 14px;margin-bottom:14px;">' +
      cols.map(function (c) {
        return '<div style="flex:1;min-width:30%;"><div style="font-size:.6rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);">' + c[0] + '</div>' +
          '<div style="font-weight:800;color:' + (c[2] || 'var(--tx)') + ';">' + c[1] + '</div></div>';
      }).join('') + '</div>';
  }

  // ═══ 1) PERGUNTA: pode lançar como "a receber"? ═══════════════════
  // v75: dá para informar a data da ENTREGA e o VENCIMENTO (inclusive no passado, para serviço entregue há tempo).
  // Se o vencimento já passou, o app mostra a multa e os juros de hoje, e o bot cria o pagamento no A Receber na hora.
  function perguntarLancar(j) {
    var rest = Math.max(0, r2((j.value || 0) - (j.pago || 0)));
    if (rest <= 0.005) { toastS('Este serviço já está quitado'); return; }
    var c = cfg();
    var entrega0 = (j.entregueEm && /^\d{4}-\d{2}-\d{2}$/.test(j.entregueEm)) ? j.entregueEm : hoje();
    var dias0 = c.diasPrazo;
    var venc = somaDias(entrega0, dias0);
    sheet(
      '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">💸 Cliente não pagou?</div>' +
      '<div style="font-size:.78rem;color:var(--t2);margin:6px 0 14px;line-height:1.5;">Posso lançar <b style="color:#e0a530;">R$ ' + brl(rest) + '</b> de <b>' + esc(j.cli) + '</b> no sistema como <b>a receber</b>?</div>' +
      '<label style="' + LBL + '">Dia da entrega</label>' +
      '<input id="hrRecEntrega" type="date" max="' + hoje() + '" value="' + entrega0 + '" style="' + INPUT + 'margin-bottom:12px;">' +
      '<label style="' + LBL + '">Dia em que ele ia pagar (vencimento)</label>' +
      '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
        [0, 3, 7, 15, 30].map(function (n) { return '<button type="button" data-rec-dias="' + n + '" style="' + CHIP + '">' + (n === 0 ? 'Na entrega' : '+' + n + ' dias') + '</button>'; }).join('') +
      '</div>' +
      '<input id="hrRecVenc" type="date" value="' + venc + '" style="' + INPUT + 'margin-bottom:12px;">' +
      '<div id="hrRecInfoAtraso" style="font-size:.72rem;line-height:1.5;margin-bottom:12px;"></div>' +
      '<div style="font-size:.7rem;color:var(--t3);line-height:1.5;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;padding:10px 12px;margin-bottom:16px;">' +
        'Se passar do vencimento o app conta <b>multa de ' + c.multaPct.toString().replace('.', ',') + '%</b> (uma vez) + <b>juros de ' + c.jurosMesPct.toString().replace('.', ',') + '% ao mês</b>.' +
        ' <u id="hrRecCfgLink" style="cursor:pointer;color:var(--gold);">Mudar taxas</u></div>' +
      '<button type="button" id="hrRecSim" style="' + BTN_OK + '">Sim, lançar como a receber</button>' +
      '<button type="button" id="hrRecNao" style="' + BTN_NO + '">Não lançar</button>',
      { fixo: true });
    var m = document.getElementById(ID);
    var diasEscolhido = dias0;
    function atualizaInfo() {
      var el = document.getElementById('hrRecInfoAtraso'); if (!el) return;
      var v = document.getElementById('hrRecVenc').value, e = document.getElementById('hrRecEntrega').value;
      if (!v) { el.innerHTML = ''; return; }
      if (e && v < e) { el.style.color = '#f08a8a'; el.textContent = 'O vencimento não pode ser antes da entrega.'; return; }
      var tmp = { value: j.value, pago: j.pago, fiado: { venc: v, multaPct: c.multaPct, jurosMesPct: c.jurosMesPct, carencia: c.carenciaDias, multaCobrada: null, jurosAcum: 0, desde: null, encPago: 0, perdoado: 0 } };
      var k = calc(tmp);
      if (k.atrasado) {
        el.style.color = '#f08a8a';
        el.innerHTML = '⏰ Venceu em ' + dmy(v) + ' (' + k.dias + (k.dias === 1 ? ' dia' : ' dias') + ' de atraso). Hoje: R$ ' + brl(k.rest) + ' + multa R$ ' + brl(k.multa) + ' + juros R$ ' + brl(k.juros) + ' = <b>R$ ' + brl(k.total) + '</b>. O bot já pode mandar o pagamento ao cliente (com a sua aprovação).';
      } else if (k.naCarencia) {
        el.style.color = '#e0a530';
        el.textContent = 'Venceu em ' + dmy(v) + ', ainda dentro da carência: sem multa nem juros por enquanto.';
      } else { el.style.color = 'var(--t3)'; el.textContent = 'Vence em ' + dmy(v) + '. Sem multa nem juros até lá.'; }
    }
    function chipsDe(base) {
      Array.prototype.forEach.call(m.querySelectorAll('[data-rec-dias]'), function (b) {
        var on = +b.getAttribute('data-rec-dias') === base;
        b.style.borderColor = on ? 'var(--gold3)' : 'var(--bd2)';
        b.style.fontWeight = on ? '800' : '600';
      });
    }
    Array.prototype.forEach.call(m.querySelectorAll('[data-rec-dias]'), function (b) {
      b.addEventListener('click', function () {
        diasEscolhido = +b.getAttribute('data-rec-dias');
        document.getElementById('hrRecVenc').value = somaDias(document.getElementById('hrRecEntrega').value || hoje(), diasEscolhido);
        chipsDe(diasEscolhido); atualizaInfo();
      });
    });
    document.getElementById('hrRecEntrega').addEventListener('change', function () {
      if (diasEscolhido != null) document.getElementById('hrRecVenc').value = somaDias(this.value || hoje(), diasEscolhido);
      atualizaInfo();
    });
    document.getElementById('hrRecVenc').addEventListener('change', function () { diasEscolhido = null; chipsDe(-1); atualizaInfo(); });
    chipsDe(dias0); atualizaInfo();
    document.getElementById('hrRecCfgLink').addEventListener('click', function () { abrirCfg(function () { perguntarLancar(j); }); });
    document.getElementById('hrRecNao').addEventListener('click', fecha);
    document.getElementById('hrRecSim').addEventListener('click', function () {
      var v = document.getElementById('hrRecVenc').value || venc;
      var e = document.getElementById('hrRecEntrega').value || hoje();
      if (v < e) { toastS('O vencimento não pode ser antes da entrega'); return; }
      lancar(j, v, e);
    });
  }

  function lancar(j, venc, entrega) {
    var c = cfg();
    entrega = entrega || hoje();
    j.entregueEm = entrega;
    j.fiado = {
      lancadoEm: entrega, venc: venc,
      multaPct: c.multaPct, jurosMesPct: c.jurosMesPct, carencia: c.carenciaDias, // taxas combinadas ficam gravadas neste lançamento
      multaCobrada: null, jurosAcum: 0, desde: null, encPago: 0, perdoado: 0
    };
    if (typeof DB.sv === 'function') DB.sv();
    fecha();
    redesenha();
    toastS('💸 Lançado a receber de ' + j.cli + (venc < hoje() ? ' — venceu ' + dmy(venc) + ' (em atraso)' : ' — vence ' + dmy(venc)));
    try { sincBot(true); } catch (e) {}
    setTimeout(function () {
      if (typeof showCB === 'function') showCB('📄 Gerar o aviso de pagamento em PDF para ' + j.cli + '?', function () { hideCB(); avisoPDF(j.id); }, function () { hideCB(); });
    }, 900);
  }

  // v75: serviço entregue mas o orçamento já tem valor "recebido" gravado (ex.: aceite ou conclusão confirmados sem o dinheiro ter entrado).
  // Pergunta se o dinheiro entrou mesmo; se não, zera o recebido, remove os lançamentos de entrada em Finanças (se você deixar marcado) e abre o "a receber".
  function corrigirRecebido(q, j) {
    if (!q || !j) return;
    var rec = r2(Math.max(q._valorRecebido || 0, j.pago || 0));
    var cli = String(q.cli || j.cli || '');
    var achados = (DB.t || []).filter(function (t) {
      if (!t || t.type !== 'in' || typeof t.desc !== 'string') return false;
      var d = t.desc;
      var pre = (d.indexOf('Entrada (aceito) — ' + cli) === 0) || (d.indexOf('Pagamento final (concluído) — ' + cli) === 0);
      if (!pre) return false;
      return !q.tipo || d.indexOf(' — ' + q.tipo) > -1;
    });
    var lista = achados.map(function (t, i) {
      return '<label style="display:flex;align-items:flex-start;gap:10px;font-size:.76rem;color:var(--t2);margin:0 0 8px;text-transform:none;letter-spacing:0;cursor:pointer;line-height:1.4;">' +
        '<input type="checkbox" data-rec-tr="' + t.id + '" checked style="width:20px!important;height:20px;flex:0 0 auto;margin-top:1px;">' +
        '<span>R$ ' + brl(t.value) + ' · ' + esc(t.date || '') + '<br><span style="color:var(--t3);">' + esc(t.desc) + '</span></span></label>';
    }).join('');
    sheet(
      '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">Confere o pagamento</div>' +
      '<div style="font-size:.78rem;color:var(--t2);margin:6px 0 14px;line-height:1.5;">O app tem <b style="color:#5dbf7a;">R$ ' + brl(rec) + '</b> registrado como recebido de <b>' + esc(cli) + '</b>, por isso este serviço aparece como pago e não abre o "a receber". O dinheiro entrou mesmo?</div>' +
      (achados.length ? '<label style="' + LBL + '">Lançamentos em Finanças ligados a esse pagamento</label>' + lista + '<div style="font-size:.7rem;color:var(--t3);margin:0 0 14px;line-height:1.5;">Os marcados são removidos de Finanças se você corrigir.</div>' : '') +
      '<button type="button" id="hrRecCorrige" style="' + BTN_OK + '">Não recebi — corrigir e lançar a receber</button>' +
      '<button type="button" id="hrRecOkPago" style="' + BTN_NO + '">Sim, ele já pagou</button>',
      { fixo: true });
    document.getElementById('hrRecOkPago').addEventListener('click', function () { fecha(); toastS('✓ Entregue — já está pago por completo'); });
    document.getElementById('hrRecCorrige').addEventListener('click', function () {
      var m = document.getElementById(ID);
      var marcados = {};
      Array.prototype.forEach.call(m.querySelectorAll('[data-rec-tr]'), function (cb) { if (cb.checked) marcados[cb.getAttribute('data-rec-tr')] = true; });
      var removidos = 0;
      for (var i = (DB.t || []).length - 1; i >= 0; i--) {
        var t = DB.t[i];
        if (t && marcados[String(t.id)]) { DB.t.splice(i, 1); if (DB.marcarExcluido) DB.marcarExcluido('t', t.id); removidos++; }
      }
      q._valorRecebido = 0;
      q._aceitoValor = 0; q._aceitoForma = ''; q._concluidoValor = 0; q._concluidoForma = '';
      q._concluidoConfirmado = false; // se for concluir depois, volta a perguntar o valor
      j.pago = 0;
      try { if (typeof _syncJobDone === 'function') _syncJobDone(j); } catch (e) {}
      if (typeof DB.sv === 'function') DB.sv();
      try { if (typeof renderFin === 'function') renderFin(); } catch (e) {}
      try { if (typeof renderOrc === 'function') renderOrc(); } catch (e) {}
      redesenha();
      toastS('Corrigido: recebido zerado' + (removidos ? ' e ' + removidos + (removidos === 1 ? ' lançamento removido' : ' lançamentos removidos') + ' de Finanças' : ''));
      setTimeout(function () { perguntarLancar(j); }, 400);
    });
  }

  // ═══ 2) RECEBER (com multa e juros) ═══════════════════════════════
  function abrirReceber(id) {
    var j = achaJob(id); if (!j) return;
    var c = calc(j);
    if (c.rest <= 0.005) { toastS('Este serviço já está quitado'); return; }
    var f = j.fiado;
    var formas = ['Dinheiro', 'Pix', 'Cartão', 'Transferência'];
    var icones = { 'Dinheiro': '💵', 'Pix': '📱', 'Cartão': '💳', 'Transferência': '🏦' };
    var chips = formas.map(function (fo, i) {
      return '<button type="button" data-rec-forma="' + fo + '" style="' + CHIP + 'min-width:44%;padding:11px 8px;font-size:.78rem;' +
        (i === 0 ? 'background:var(--gold3);color:#000;border-color:var(--gold3);font-weight:800;' : '') + '">' + icones[fo] + ' ' + fo + '</button>';
    }).join('');

    var cols = [['Serviço', 'R$ ' + brl(j.value || 0)]];
    if ((j.pago || 0) > 0) cols.push(['Já recebido', 'R$ ' + brl(j.pago), '#5dbf7a']);
    cols.push(['Falta', 'R$ ' + brl(c.rest), '#e0a530']);

    var enc = '';
    if (f) {
      if (c.atrasado) {
        enc = '<div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.35);border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:.76rem;line-height:1.6;">' +
          '<b style="color:#f08a8a;">⏰ Atrasado há ' + c.dias + (c.dias === 1 ? ' dia' : ' dias') + '</b> (venceu ' + dm(f.venc) + ')<br>' +
          'Multa: R$ ' + brl(c.multa) + ' · Juros: R$ ' + brl(c.juros) +
          ((f.encPago || 0) + (f.perdoado || 0) > 0.005 ? '<br><span style="color:var(--t3);">Já pago/perdoado de encargos: R$ ' + brl((f.encPago || 0) + (f.perdoado || 0)) + '</span>' : '') +
          '<br><b>Total hoje: <span style="color:#e0a530;">R$ ' + brl(c.total) + '</span></b></div>';
      } else {
        enc = '<div style="font-size:.74rem;color:var(--t3);margin-bottom:14px;">📅 Vence em ' + dmy(f.venc) + ' — sem multa nem juros até lá.</div>';
      }
    }

    sheet(
      '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">💰 Receber — ' + esc(j.cli) + '</div>' +
      '<div style="font-size:.72rem;color:var(--t3);margin:2px 0 14px;">' + esc(j.desc || '') + '</div>' +
      resumoBox(cols) + enc +
      '<label style="' + LBL + '">Valor recebido agora</label>' +
      valorBox('hrRecVal', c.total) +
      '<div id="hrRecSaldo" style="font-size:.72rem;margin:6px 0 14px;min-height:16px;"></div>' +
      '<input type="hidden" id="hrRecForma" value="Dinheiro">' +
      '<label style="' + LBL + 'margin-bottom:8px;">Forma de pagamento</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' + chips + '</div>' +
      '<label style="display:flex;align-items:center;gap:10px;font-size:.8rem;color:var(--t2);margin:0 0 16px;text-transform:none;letter-spacing:0;cursor:pointer;"><input type="checkbox" id="hrRecComp" checked style="width:20px!important;height:20px;"> Gerar comprovante para o cliente</label>' +
      '<button type="button" id="hrRecOk" style="' + BTN_OK + '">Confirmar recebimento</button>' +
      (f ? '<button type="button" id="hrRecFecha" style="' + BTN_NO + '">Fechar</button>'
         : '<button type="button" id="hrRecNaoPagou" style="' + BTN_LN + '">💸 Cliente não pagou agora — lançar como a receber</button>' +
           '<button type="button" id="hrRecFecha" style="' + BTN_NO + '">Agora não</button>'),
      { fixo: true });

    var m = document.getElementById(ID);
    function atualiza() {
      var el = document.getElementById('hrRecSaldo'); if (!el) return;
      var v = num(document.getElementById('hrRecVal').value);
      var falta = r2(c.total - v);
      if (v > c.total + 0.005) { el.style.color = '#f08a8a'; el.textContent = 'Maior que o total devido (R$ ' + brl(c.total) + ')'; }
      else if (falta <= 0.005) { el.style.color = '#5dbf7a'; el.textContent = '✓ Fica quitado com esse pagamento'; }
      else { el.style.color = '#e0a530'; el.textContent = 'Fica faltando R$ ' + brl(falta) + ' depois desse pagamento'; }
    }
    atualiza();
    document.getElementById('hrRecVal').addEventListener('input', atualiza);
    Array.prototype.forEach.call(m.querySelectorAll('[data-rec-forma]'), function (b) {
      b.addEventListener('click', function () {
        document.getElementById('hrRecForma').value = b.getAttribute('data-rec-forma');
        Array.prototype.forEach.call(m.querySelectorAll('[data-rec-forma]'), function (o) {
          var on = o === b;
          o.style.background = on ? 'var(--gold3)' : 'var(--s2)';
          o.style.color = on ? '#000' : 'var(--tx)';
          o.style.borderColor = on ? 'var(--gold3)' : 'var(--bd2)';
          o.style.fontWeight = on ? '800' : '600';
        });
      });
    });
    var fx = document.getElementById('hrRecFecha'); if (fx) fx.addEventListener('click', fecha);
    var np = document.getElementById('hrRecNaoPagou');
    if (np) np.addEventListener('click', function () { perguntarLancar(j); });
    document.getElementById('hrRecOk').addEventListener('click', function () {
      var v = num(document.getElementById('hrRecVal').value);
      if (v <= 0) { toastS('Informe um valor válido'); return; }
      if (v > c.total + 0.005) { toastS('Valor maior que o total devido'); return; }
      var forma = document.getElementById('hrRecForma').value;
      var comp = document.getElementById('hrRecComp').checked;
      fecha();
      receber(j, v, forma, comp);
    });
  }

  // Mantém o orçamento em dia: valor recebido acompanha o serviço; quitou tudo → status Concluído
  function sincOrc(j) {
    try {
      var q = achaOrc(j); if (!q) return;
      q._valorRecebido = Math.max(q._valorRecebido || 0, r2(j.pago || 0));
      if (r2((j.value || 0) - (j.pago || 0)) <= 0.005 && q.status !== 'concluido') {
        q.status = 'concluido'; q._concluidoConfirmado = true; q._statusDate = hoje();
        if (typeof renderOrc === 'function') { try { renderOrc(); } catch (e) {} }
        toastS('🏆 ' + (j.cli || 'Cliente') + ' quitou — orçamento marcado como Concluído');
      }
    } catch (e) {}
  }

  // aplica o pagamento: primeiro quita multa/juros, o resto abate o principal
  // Abate o pagamento: primeiro multa e juros, o resto vai para o principal. Não mexe em Finanças.
  function aplicaPagamento(j, v) {
    var ref = hoje();
    var c = calc(j, ref);
    var encPago = 0;
    if (j.fiado) {
      congela(j, ref);
      encPago = Math.min(v, c.enc);
      j.fiado.encPago = r2((j.fiado.encPago || 0) + encPago);
    }
    var principal = r2(Math.min(v - encPago, c.rest));
    j.pago = r2((j.pago || 0) + principal);
    var quitou = r2((j.value || 0) - (j.pago || 0)) <= 0.005;
    if (j.fiado && quitou) j.fiado.quitadoEm = ref;
    sincOrc(j);
    return { encPago: encPago, principal: principal, quitou: quitou };
  }

  function receber(j, v, forma, comp) {
    var ap = aplicaPagamento(j, v);
    var encPago = ap.encPago, quitou = ap.quitou;
    var desc = 'Entrega — ' + j.cli + ' · ' + forma + (encPago > 0.005 ? ' (inclui R$ ' + brl(encPago) + ' de multa/juros)' : '');
    var tr = (typeof addTr === 'function') ? addTr('in', desc, v, null, j.id) : null;
    if (typeof DB.sv === 'function') DB.sv();
    redesenha();
    if (document.getElementById('hrRecLista')) abrirLista();
    toastS('✓ R$ ' + brl(v) + ' (' + forma + ') lançado em Finanças' + (quitou ? ' — quitado' : ''));
    if (comp && tr && typeof gerarComprovante === 'function') setTimeout(function () { gerarComprovante(tr.id); }, 400);
  }

  // ═══ 3) LISTA "A RECEBER" ═════════════════════════════════════════
  function lista() {
    return (DB.j || []).filter(emAberto).map(function (j) { return { j: j, c: calc(j) }; })
      .sort(function (a, b) { return (b.c.dias - a.c.dias) || String(a.j.fiado.venc).localeCompare(String(b.j.fiado.venc)); });
  }

  function faixa() {
    var l = lista(); if (!l.length) return '';
    var tot = 0, atr = 0;
    l.forEach(function (x) { tot += x.c.total; if (x.c.atrasado) atr++; });
    return '<button type="button" data-hrrec-lista="1" style="display:flex;width:100%;text-align:left;align-items:center;gap:9px;padding:10px 12px;border-radius:12px;margin:8px 0 2px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.4);font-size:.74rem;line-height:1.35;color:var(--tx);font-family:inherit;cursor:pointer;">💸<div style="flex:1;">' +
      '<b style="color:#f08a8a;font-size:.86rem;">A receber de clientes: R$ ' + brl(tot) + '</b><br>' + l.length + (l.length === 1 ? ' cliente' : ' clientes') +
      (atr ? ' · <b>' + atr + ' em atraso</b>' : '') + ' · toque para ver</div><span style="color:var(--t3);">›</span></button>';
  }

  function tagCard(j) {
    if (!emAberto(j)) return '';
    var c = calc(j);
    var f = j.fiado;
    var txt = c.atrasado
      ? '⏰ Atrasado ' + c.dias + 'd · deve R$ ' + brl(c.total) + (c.enc > 0.005 ? ' (c/ multa e juros)' : '')
      : '💸 A receber R$ ' + brl(c.rest) + ' · vence ' + dm(f.venc);
    return '<div class="ag2-meta"><button type="button" class="ag2-tag pay ag2-recv" data-hrrec-receber="' + j.id + '" style="' +
      (c.atrasado ? 'background:rgba(248,113,113,.22);color:#ff9d9d;' : 'background:rgba(224,165,48,.15);color:#e0a530;') + '">' + txt + ' · toque p/ receber</button></div>';
  }

  // Devendo mas ainda fora do A Receber (o bot ainda não cobra): entregue com saldo, ou atrasado >7 dias.
  function semBot() {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return (DB.j || []).filter(function (j) {
      if (!j || j.fiado) return false;
      var resto = (+j.value || 0) - (+j.pago || 0); if (resto <= 0.01) return false;
      if (j.done) return true;
      if (!j.end) return false;
      return (hoje - new Date(j.end + 'T00:00:00')) / 864e5 > 7;
    }).sort(function (a, b) { return ((+b.value || 0) - (+b.pago || 0)) - ((+a.value || 0) - (+a.pago || 0)); });
  }
  function blocoSemBot() {
    var sb = semBot(); if (!sb.length) return '';
    var tot = 0; sb.forEach(function (j) { tot += (+j.value || 0) - (+j.pago || 0); });
    var h = '<div style="margin:16px 0 8px;font-size:.8rem;font-weight:800;color:var(--t2);">⚠️ Devendo, mas o bot ainda não cobra · R$ ' + brl(tot) + '</div>' +
      '<div style="font-size:.7rem;color:var(--t3);margin:-4px 0 8px;line-height:1.4;">Toque em 🤖 Bot cobrar para o bot assumir a cobrança pelo WhatsApp (com aviso, multa e juros após o vencimento).</div>';
    sb.forEach(function (j) {
      var resto = (+j.value || 0) - (+j.pago || 0);
      h += '<div style="background:var(--s2);border:1px solid var(--bd2);border-left:4px solid var(--t3);border-radius:14px;padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">' +
        '<div style="flex:1;min-width:0;"><div style="font-weight:800;overflow-wrap:anywhere;">' + esc(j.cli || '') + '</div>' +
        '<div style="font-size:.7rem;color:var(--t3);overflow-wrap:anywhere;">' + esc(j.desc || '') + (j.done ? ' · entregue' : ' · em produção') + '</div>' +
        '<div style="font-weight:800;color:#f08a8a;font-size:.86rem;margin-top:2px;">R$ ' + brl(resto) + '</div></div>' +
        '<button type="button" data-botcob="' + j.id + '" style="padding:9px 11px;border:none;border-radius:10px;background:var(--gold3);color:#000;font-weight:800;font-size:.74rem;cursor:pointer;font-family:inherit;white-space:nowrap;">🤖 Bot cobrar</button></div>';
    });
    return h;
  }

  function abrirLista() {
    var l = lista();
    var totRest = 0, totEnc = 0;
    l.forEach(function (x) { totRest += x.c.rest; totEnc += x.c.enc; });
    var h = '<div id="hrRecLista"></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
        '<div style="flex:1;font-size:1.02rem;font-weight:800;color:var(--gold);">💸 A Receber</div>' +
        '<button type="button" data-rec-cfg="1" style="border:1px solid var(--bd2);background:var(--s2);color:var(--t2);border-radius:9px;padding:7px 10px;font-size:.7rem;cursor:pointer;font-family:inherit;">⚙️ Taxas</button>' +
      '</div>';
    if (!l.length) {
      var sbH = blocoSemBot();
      h += (sbH
        ? '<div style="text-align:center;padding:14px 10px 4px;color:var(--t3);font-size:.8rem;line-height:1.5;">🤖 O bot ainda não está cobrando ninguém.</div>' + sbH
        : '<div style="text-align:center;padding:30px 10px;color:var(--t3);font-size:.85rem;line-height:1.6;"><div style="font-size:2rem;">🎉</div>Nenhum cliente devendo.</div>') +
           '<button type="button" id="hrRecFecha" style="' + BTN_NO + '">Fechar</button>';
      sheet(h, { alto: '88vh' }); var b0 = document.getElementById('hrRecFecha'); if (b0) b0.addEventListener('click', fecha);
      return;
    }
    h += resumoBox([['Principal', 'R$ ' + brl(totRest), '#e0a530'], ['Multa + juros', 'R$ ' + brl(totEnc), totEnc > 0.005 ? '#f08a8a' : 'var(--t3)'], ['Total hoje', 'R$ ' + brl(totRest + totEnc), '#5dbf7a']]);
    l.forEach(function (x) {
      var j = x.j, c = x.c, f = j.fiado;
      var cor = c.atrasado ? '#f08a8a' : '#e0a530';
      var sit = c.atrasado ? '⏰ Atrasado há ' + c.dias + (c.dias === 1 ? ' dia' : ' dias') + ' (venceu ' + dm(f.venc) + ')' : c.naCarencia ? '⏳ Venceu ' + dm(f.venc) + ' · dentro da carência de ' + (f.carencia || 0) + ' dias' : '📅 Vence ' + dmy(f.venc);
      h += '<div style="background:var(--s2);border:1px solid var(--bd2);border-left:4px solid ' + cor + ';border-radius:14px;padding:12px 13px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;"><div style="font-weight:800;overflow-wrap:anywhere;">' + esc(j.cli) + '</div>' +
          '<div style="font-weight:800;color:' + cor + ';white-space:nowrap;">R$ ' + brl(c.total) + '</div></div>' +
        '<div style="font-size:.7rem;color:var(--t3);margin:2px 0 6px;overflow-wrap:anywhere;">' + esc(j.desc || '') + '</div>' +
        '<div style="font-size:.74rem;color:' + cor + ';font-weight:700;">' + sit + '</div>' +
        (c.atrasado
          ? '<div style="font-size:.7rem;color:var(--t2);margin-top:3px;">Principal R$ ' + brl(c.rest) + ' + multa R$ ' + brl(c.multa) + ' + juros R$ ' + brl(c.juros) + (((f.encPago || 0) + (f.perdoado || 0)) > 0.005 ? ' − já pago/perdoado R$ ' + brl((f.encPago || 0) + (f.perdoado || 0)) : '') + '<br>Hoje rende R$ ' + brl(c.jurosDia) + ' de juros por dia.</div>'
          : '<div style="font-size:.7rem;color:var(--t3);margin-top:3px;">Sem multa/juros até o vencimento.</div>') +
        '<div style="display:flex;gap:6px;margin-top:10px;">' +
          '<button type="button" data-rec-r="' + j.id + '" style="flex:1.4;padding:10px 4px;border:none;border-radius:10px;background:var(--gold3);color:#000;font-weight:800;font-size:.76rem;cursor:pointer;font-family:inherit;">💰 Receber</button>' +
          '<button type="button" data-rec-w="' + j.id + '" style="flex:1;padding:10px 4px;border:1px solid var(--bd2);border-radius:10px;background:transparent;color:var(--tx);font-weight:700;font-size:.76rem;cursor:pointer;font-family:inherit;">📲 Cobrar</button>' +
          '<button type="button" data-rec-p="' + j.id + '" style="flex:1;padding:10px 4px;border:1px solid var(--bd2);border-radius:10px;background:transparent;color:var(--tx);font-weight:700;font-size:.76rem;cursor:pointer;font-family:inherit;">📄 Aviso</button>' +
          '<button type="button" data-rec-m="' + j.id + '" style="padding:10px 12px;border:1px solid var(--bd2);border-radius:10px;background:transparent;color:var(--t2);font-size:.9rem;cursor:pointer;font-family:inherit;">⋯</button>' +
        '</div></div>';
    });
    h += blocoSemBot();
    h += '<button type="button" id="hrRecFecha" style="' + BTN_NO + '">Fechar</button>';
    sheet(h, { alto: '90vh' });
    var bf = document.getElementById('hrRecFecha'); if (bf) bf.addEventListener('click', fecha);
  }

  // ── mais opções de um lançamento ──────────────────────────────────
  function abrirMais(id) {
    var j = achaJob(id); if (!j || !j.fiado) return;
    var c = calc(j), f = j.fiado;
    sheet(
      '<div style="font-size:1rem;font-weight:800;color:var(--gold);">' + esc(j.cli) + '</div>' +
      '<div style="font-size:.72rem;color:var(--t3);margin:2px 0 14px;">Deve R$ ' + brl(c.total) + ' · vence ' + dmy(f.venc) + '</div>' +
      '<label style="' + LBL + '">Mudar vencimento</label>' +
      '<input id="hrRecNovoVenc" type="date" value="' + esc(f.venc) + '" style="' + INPUT + 'margin-bottom:10px;">' +
      '<button type="button" id="hrRecSalvaVenc" style="' + BTN_OK + 'padding:12px;">Salvar novo vencimento</button>' +
      (c.enc > 0.005 ? '<button type="button" id="hrRecPerdoa" style="' + BTN_LN + '">🤝 Perdoar multa e juros (R$ ' + brl(c.enc) + ')</button>' : '') +
      '<button type="button" id="hrRecTira" style="' + BTN_NO + 'color:#f08a8a;">Tirar de "a receber" (não cobrar mais)</button>' +
      '<button type="button" id="hrRecVolta" style="' + BTN_NO + '">Voltar</button>');
    document.getElementById('hrRecVolta').addEventListener('click', abrirLista);
    document.getElementById('hrRecSalvaVenc').addEventListener('click', function () {
      var v = document.getElementById('hrRecNovoVenc').value;
      if (!v) { toastS('Escolha uma data'); return; }
      congela(j, hoje()); // o que já correu até hoje fica gravado
      f.venc = v;
      if (f.desde && f.desde < v) f.desde = null;
      DB.sv(); redesenha(); toastS('📅 Novo vencimento: ' + dmy(v)); abrirLista();
    });
    var pe = document.getElementById('hrRecPerdoa');
    if (pe) pe.addEventListener('click', function () {
      var cc = calc(j);
      congela(j, hoje());
      f.perdoado = r2((f.perdoado || 0) + cc.enc);
      DB.sv(); redesenha(); toastS('🤝 Multa e juros perdoados'); abrirLista();
    });
    document.getElementById('hrRecTira').addEventListener('click', function () {
      if (typeof showCB === 'function') {
        showCB('Tirar ' + j.cli + ' de "a receber"? O saldo continua no serviço, só para de contar juros.', function () {
          hideCB(); delete j.fiado; DB.sv(); redesenha(); toastS('Removido de "a receber"'); abrirLista();
        }, function () { hideCB(); });
      } else { delete j.fiado; DB.sv(); redesenha(); abrirLista(); }
    });
  }

  // ═══ 4) COBRAR PELO WHATSAPP ══════════════════════════════════════
  function cobrar(id) {
    var j = achaJob(id); if (!j || !j.fiado) return;
    var c = calc(j), f = j.fiado, q = achaOrc(j);
    var emp = (typeof CFG !== 'undefined' && CFG && CFG.emp) || {};
    var nome = String(j.cli || '').trim().split(/\s+/)[0] || 'tudo bem';
    var t = 'Olá, ' + nome + '! Tudo bem? Aqui é da ' + (emp.nome || 'HR Mármores e Granitos') + '.\n\n';
    t += 'Passando para lembrar do pagamento de *R$ ' + brl(c.rest) + '* referente a ' + (j.desc || 'seu serviço') + ', com vencimento em ' + dmy(f.venc) + '.\n';
    if (c.atrasado) {
      t += '\nComo o pagamento está em atraso há ' + c.dias + (c.dias === 1 ? ' dia' : ' dias') + ', foram acrescidos multa de ' + String(f.multaPct).replace('.', ',') + '% e juros de ' + String(f.jurosMesPct).replace('.', ',') + '% ao mês. ';
      t += 'O valor atualizado hoje é de *R$ ' + brl(c.total) + '*.\n';
    }
    t += '\nQualquer dúvida, é só chamar. Obrigado!';
    var tel = String((q && q.tel) || j.tel || '').replace(/\D/g, '');
    if (tel && tel.length <= 11) tel = '55' + tel;
    window.open((tel ? 'https://wa.me/' + tel : 'https://wa.me/') + '?text=' + encodeURIComponent(t), '_blank');
  }

  // ═══ 4b) AVISO DE PAGAMENTO EM PDF (para o cliente que recebeu e não pagou) ═══
  // Abre a página pronta para imprimir / "Salvar como PDF" (mesmo padrão do comprovante).
  function avisoPDF(id) {
    var j = achaJob(id); if (!j || !j.fiado) { toastS('Lance como "a receber" primeiro'); return; }
    var f = j.fiado, c = calc(j), car = f.carencia || 0;
    var emp = (typeof CFG !== 'undefined' && CFG && CFG.emp) || {};
    var nomeEmp = emp.nome || 'HR Mármores e Granitos';
    var multaTxt = String(f.multaPct == null ? 0 : f.multaPct).replace('.', ',');
    var jurosTxt = String(f.jurosMesPct == null ? 0 : f.jurosMesPct).replace('.', ',');
    var jDia = r2(c.rest * (f.jurosMesPct || 0) / 100 / 30);
    var inicio = somaDias(f.venc, car + 1);
    var hojeTxt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    var num = 'AVP-' + String(j.id).slice(-6);
    var linhas = '<tr><td>Até ' + dmy(f.venc) + (car ? ' (+' + car + ' ' + (car === 1 ? 'dia' : 'dias') + ' de tolerância)' : '') + '</td><td>—</td><td>—</td><td class="r">R$ ' + brl(c.rest) + '</td></tr>';
    [7, 15, 30].forEach(function (n) {
      var d = somaDias(f.venc, car + n), x = calc(j, d);
      linhas += '<tr><td>' + dmy(d) + '</td><td>R$ ' + brl(x.multa) + '</td><td>R$ ' + brl(x.juros) + '</td><td class="r">R$ ' + brl(x.total) + '</td></tr>';
    });
    var atrasoBloco = c.atrasado
      ? '<div class="alerta"><b>⏰ Pagamento em atraso há ' + c.dias + (c.dias === 1 ? ' dia' : ' dias') + '.</b><br>Valor atualizado hoje: <b>R$ ' + brl(c.total) + '</b> (principal R$ ' + brl(c.rest) + ' + multa R$ ' + brl(c.multa) + ' + juros R$ ' + brl(c.juros) + '). Os juros seguem acumulando a cada dia até a quitação.</div>'
      : '';
    var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>Aviso de Pagamento — ' + esc(j.cli) + '</title><style>'
      + '*{margin:0;padding:0;box-sizing:border-box;}'
      + 'body{font-family:Inter,Arial,sans-serif;font-size:12.5px;color:#1a1a1a;background:#f5f0e8;display:flex;justify-content:center;padding:20px;}'
      + '.page{max-width:640px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.13);}'
      + '.hdr{background:linear-gradient(135deg,#0f0c00,#1a1400 60%,#0f0c00);padding:26px 36px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #C9A84C;}'
      + '.brand{font-size:18px;font-weight:900;color:#C9A84C;line-height:1.1;}.tag{font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.5);margin-top:3px;}'
      + '.hr{text-align:right;}.doc{font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);}.dn{font-size:14px;font-weight:900;color:#C9A84C;margin-top:2px;}.dd{font-size:9px;color:rgba(255,255,255,.45);margin-top:2px;}'
      + '.body{padding:28px 36px;}.sec{font-size:8.5px;font-weight:900;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;border-bottom:1.5px solid #e8d090;padding-bottom:6px;margin:22px 0 12px;}.sec:first-child{margin-top:0;}'
      + 'p{line-height:1.65;color:#333;margin-bottom:10px;}'
      + '.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:6px 0 4px;}.fl label{display:block;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:3px;}.fl span{font-weight:700;}'
      + '.vb{background:linear-gradient(135deg,#0f0c00,#1e1800);border-radius:12px;padding:18px 22px;margin:16px 0;border:1px solid rgba(201,168,76,.25);display:flex;justify-content:space-between;align-items:center;}'
      + '.vl{font-size:9px;color:rgba(255,255,255,.5);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;}.vn{font-size:28px;font-weight:900;color:#C9A84C;}.vd{font-size:15px;font-weight:800;color:#fff;}'
      + '.alerta{background:#fdecea;border:1.5px solid #e57373;border-radius:10px;padding:12px 16px;margin:14px 0;line-height:1.6;color:#8a1c1c;}'
      + '.regra{background:#fff8e1;border:1.5px solid #f0c040;border-radius:10px;padding:14px 18px;line-height:1.7;color:#5a4300;}'
      + 'table{width:100%;border-collapse:collapse;margin-top:10px;}th{background:#1a1400;color:#C9A84C;padding:9px 12px;text-align:left;font-size:8px;letter-spacing:1.4px;text-transform:uppercase;}'
      + 'td{padding:9px 12px;border-bottom:1px solid #f0e8d8;font-size:11.5px;}.r,th:last-child{text-align:right;font-weight:800;}'
      + '.nota{font-size:10.5px;color:#777;margin-top:12px;line-height:1.55;}'
      + '.foot{background:#0f0c00;padding:14px 36px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}.foot span{font-size:8.5px;color:rgba(201,168,76,.55);}'
      + '@media print{body{background:#fff;padding:0;}.page{box-shadow:none;border-radius:0;}}'
      + '</style></head><body><div class="page">'
      + '<div class="hdr"><div><div class="brand">' + esc(nomeEmp) + '</div><div class="tag">Mármores · Granitos · Acessórios</div></div>'
      + '<div class="hr"><div class="doc">Aviso de Pagamento</div><div class="dn">' + num + '</div><div class="dd">' + hojeTxt + '</div></div></div>'
      + '<div class="body">'
      + '<div class="sec">Identificação</div>'
      + '<div class="row2"><div class="fl"><label>Cliente</label><span>' + esc(j.cli) + '</span></div><div class="fl"><label>Serviço</label><span>' + esc(j.desc || 'Serviço entregue') + '</span></div>'
      + '<div class="fl"><label>Data da entrega</label><span>' + dmy(f.lancadoEm) + '</span></div><div class="fl"><label>Vencimento</label><span>' + dmy(f.venc) + '</span></div></div>'
      + '<div class="vb"><div><div class="vl">Valor em aberto</div><div class="vn">R$ ' + brl(c.rest) + '</div></div><div style="text-align:right;"><div class="vl">Pagar até</div><div class="vd">' + dmy(f.venc) + '</div></div></div>'
      + atrasoBloco
      + '<p>Prezado(a) <b>' + esc(j.cli) + '</b>, o serviço acima foi entregue e consta em nosso sistema um valor pendente de pagamento. Pedimos que a quitação seja feita até <b>' + dmy(f.venc) + '</b>.</p>'
      + '<div class="sec">Condições em caso de atraso</div>'
      + '<div class="regra">Se o pagamento não for realizado até <b>' + dmy(f.venc) + '</b>' + (car ? ' (mais ' + car + (car === 1 ? ' dia' : ' dias') + ' de tolerância)' : '') + ', a partir de <b>' + dmy(inicio) + '</b> passam a incidir sobre o valor em aberto:<br>'
      + '• <b>Multa de ' + multaTxt + '%</b>, cobrada uma única vez;<br>'
      + '• <b>Juros de ' + jurosTxt + '% ao mês</b>, calculados por dia de atraso (cerca de <b>R$ ' + brl(jDia) + ' por dia</b> sobre o valor atual).</div>'
      + '<div class="sec">Simulação do valor</div>'
      + '<table><tr><th>Pagamento em</th><th>Multa</th><th>Juros</th><th>Total a pagar</th></tr>' + linhas + '</table>'
      + '<p class="nota">Valores calculados sobre o saldo em aberto na data de emissão. Após o pagamento, envie o comprovante pelo WhatsApp para darmos a baixa. Em caso de dúvida ou necessidade de negociação, entre em contato antes do vencimento.</p>'
      + '</div>'
      + '<div class="foot"><span><b>' + esc(nomeEmp) + '</b> · ' + esc(emp.tel || '') + '</span><span>' + esc(emp.cnpj || '') + ' · ' + esc(emp.cidade || '') + '</span></div>'
      + '</div><script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script></body></html>';
    var w = window.open('', '_blank', 'width=720,height=900');
    if (w) { w.document.write(html); w.document.close(); }
    else toastS('Permita pop-ups para gerar o aviso');
  }

  // ═══ 5) CONFIGURAR TAXAS ══════════════════════════════════════════
  function abrirCfg(voltaPara) {
    var c = cfg();
    function campo(id, rot, val, suf) {
      return '<label style="' + LBL + '">' + rot + '</label><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><input id="' + id + '" type="text" inputmode="decimal" value="' + String(val).replace('.', ',') + '" style="' + INPUT + 'flex:1;"><span style="color:var(--t3);font-size:.8rem;min-width:56px;">' + suf + '</span></div>';
    }
    sheet(
      '<div style="font-size:1.02rem;font-weight:800;color:var(--gold);">⚙️ Multa e juros</div>' +
      '<div style="font-size:.72rem;color:var(--t3);margin:4px 0 14px;line-height:1.5;">Valem para os <b>próximos</b> lançamentos, no app e no bot do WhatsApp (os dois usam esta mesma conta). O que já foi lançado mantém as taxas combinadas na época. Padrão comum: multa de 2% e juros de 1% ao mês — confirme que isso consta no seu contrato/orçamento.</div>' +
      campo('hrRecCfgMulta', 'Multa por atraso (uma vez)', c.multaPct, '%') +
      campo('hrRecCfgJuros', 'Juros ao mês (por dia, proporcional)', c.jurosMesPct, '% a.m.') +
      campo('hrRecCfgCar', 'Carência: dias depois do vencimento sem multa nem juros', c.carenciaDias, 'dias') +
      campo('hrRecCfgDias', 'Prazo padrão para o cliente pagar', c.diasPrazo, 'dias') +
      '<button type="button" id="hrRecCfgOk" style="' + BTN_OK + '">Salvar</button>' +
      '<button type="button" id="hrRecCfgNo" style="' + BTN_NO + '">Cancelar</button>');
    document.getElementById('hrRecCfgNo').addEventListener('click', function () { if (voltaPara) voltaPara(); else fecha(); });
    document.getElementById('hrRecCfgOk').addEventListener('click', function () {
      var mu = num(document.getElementById('hrRecCfgMulta').value);
      var ju = num(document.getElementById('hrRecCfgJuros').value);
      var di = Math.round(num(document.getElementById('hrRecCfgDias').value));
      var ca = Math.round(num(document.getElementById('hrRecCfgCar').value));
      if (ca < 0 || ca > 60) { toastS('A carência deve ficar entre 0 e 60 dias'); return; }
      if (mu < 0 || mu > 100 || ju < 0 || ju > 100) { toastS('Informe porcentagens entre 0 e 100'); return; }
      salvaCfg({ multaPct: mu, jurosMesPct: ju, diasPrazo: di > 0 ? di : PADRAO.diasPrazo, carenciaDias: ca });
      sincBot(true);
      toastS('✓ Taxas salvas');
      if (voltaPara) voltaPara(); else fecha();
    });
  }


  // ═══ 6) LIGAÇÃO COM O BOT (mesma conta de multa e juros nos dois lados) ═══
  // O app manda ao bot a lista "a receber" + as taxas daqui (⚙️ Taxas é o único lugar onde se muda).
  // O bot usa a MESMA fórmula (ver calc) para listar, cobrar e avisar. Quando o bot recebe um pagamento
  // (Pix ou dinheiro) de um cliente que está nesta lista, ele sugere a baixa; o app pergunta antes de aplicar.
  var botTimer = null, ultimoEnvio = '', perguntados = {};

  function achaConexao() {
    var url = '', key = '';
    function olha(o) {
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === 'string') {
          if (!url && /^https:\/\/[^\s]+/.test(v) && /bot|worker|url|base/i.test(k)) url = v;
          if (!key && /key|chave|token/i.test(k) && /bot/i.test(k) && v.length >= 8) key = v;
        }
      });
    }
    try { if (window.HRRec && HRRec._bot) { url = HRRec._bot.url || ''; key = HRRec._bot.key || ''; } } catch (e) {}
    // Configuração oficial do bot no app (a mesma de Secretaria/Pedidos): localStorage 'hr_bot_cfg' → {url, key}
    if (!url || !key) {
      try {
        var oc = (typeof _getBotCfg === 'function') ? _getBotCfg() : JSON.parse(localStorage.getItem('hr_bot_cfg') || '{}');
        if (oc && oc.url && oc.key) { url = String(oc.url); key = String(oc.key); }
      } catch (e) {}
    }
    try { olha(typeof CFG !== 'undefined' ? CFG : null); olha(typeof CFG !== 'undefined' && CFG ? CFG.bot : null); } catch (e) {}
    if (!url || !key) {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var nome = localStorage.key(i), raw = localStorage.getItem(nome) || '';
          if (/bot/i.test(nome) && /^https:\/\//.test(raw) && !url) url = raw;
          else if (/bot/i.test(nome) && /key|chave/i.test(nome) && raw && raw.charAt(0) !== '{' && !key) key = raw;
          else if (raw.charAt(0) === '{' && /bot/i.test(nome)) { try { olha(JSON.parse(raw)); } catch (e) {} }
        }
      } catch (e) {}
    }
    url = String(url || '').replace(/\/+$/, '').replace(/\/bot$/, '');
    return (url && key) ? { url: url, key: key } : null;
  }

  function payloadBot() {
    var c = cfg();
    var itens = lista().map(function (x) {
      var j = x.j, f = j.fiado, q = achaOrc(j);
      return {
        id: String(j.id), cliente: String(j.cli || ''), tel: String((q && q.tel) || j.tel || ''), desc: String(j.desc || ''),
        valor: r2(j.value || 0), pago: r2(j.pago || 0), venc: f.venc, lancadoEm: f.lancadoEm || '',
        multaPct: f.multaPct, jurosMesPct: f.jurosMesPct, carencia: f.carencia || 0,
        multaCobrada: f.multaCobrada == null ? null : f.multaCobrada, jurosAcum: f.jurosAcum || 0, desde: f.desde || null,
        encPago: f.encPago || 0, perdoado: f.perdoado || 0
      };
    });
    return { config: { multaPct: c.multaPct, jurosMesPct: c.jurosMesPct, carenciaDias: c.carenciaDias }, itens: itens };
  }

  function chamaBot(metodo, caminho, corpo) {
    var con = achaConexao();
    if (!con || typeof fetch !== 'function') return Promise.reject(new Error('sem conexão com o bot'));
    return fetch(con.url + caminho, {
      method: metodo, headers: { 'Content-Type': 'application/json', 'x-bot-key': con.key },
      body: corpo ? JSON.stringify(corpo) : undefined
    }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d && d.error || ('HTTP ' + r.status)); return d; }); });
  }

  function sincBot(agora) {
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(function () {
      botTimer = null;
      var corpo; try { corpo = payloadBot(); } catch (e) { return; }
      var s = JSON.stringify(corpo);
      if (s === ultimoEnvio) return;
      chamaBot('POST', '/bot/a-receber', corpo).then(function () { ultimoEnvio = s; })
        .catch(function (e) { if (window.console) console.warn('[A Receber] bot não sincronizou:', e.message); });
    }, agora ? 300 : 2000);
  }

  function pegaSugestoes() {
    if (typeof document !== 'undefined' && document.hidden) return;
    chamaBot('GET', '/bot/a-receber').then(function (d) {
      (d.sugestoes || []).forEach(function (sg) {
        if (perguntados[sg.id]) return;
        perguntados[sg.id] = 1;
        var j = achaJob(sg.jobId);
        if (!j || !emAberto(j)) { chamaBot('POST', '/bot/a-receber/confirmar', { ids: [sg.id] }).catch(function () {}); return; }
        var msg = 'O bot recebeu R$ ' + brl(sg.valor) + ' (' + esc(sg.forma) + ') de ' + esc(j.cli) + '. Dar baixa em "A Receber"? A entrada em Finanças já foi lançada pelo bot, o app não lança de novo.';
        var feito = function () { chamaBot('POST', '/bot/a-receber/confirmar', { ids: [sg.id] }).catch(function () {}); };
        if (typeof showCB === 'function') {
          showCB(msg, function () {
            hideCB();
            var ap = aplicaPagamento(j, +sg.valor || 0);
            if (typeof DB.sv === 'function') DB.sv();
            redesenha(); toastS('✓ Baixa aplicada em ' + j.cli + (ap.quitou ? ' — quitado' : ''));
            feito();
          }, function () { hideCB(); feito(); });
        }
      });
    }).catch(function () {});
  }

  function ligaBot() {
    try {
      if (typeof DB !== 'undefined' && DB && typeof DB.sv === 'function' && !DB.sv.__hrRec) {
        var orig = DB.sv;
        DB.sv = function () { var r = orig.apply(this, arguments); try { sincBot(); } catch (e) {} return r; };
        DB.sv.__hrRec = true;
      }
    } catch (e) {}
    sincBot(true);
    setInterval(pegaSugestoes, 60000);
    setTimeout(pegaSugestoes, 5000);
  }
  setTimeout(ligaBot, 3000);

  // ── cliques (delegado no documento) ───────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var el;
    if ((el = t.closest('[data-hrrec-lista]'))) { abrirLista(); return; }
    if ((el = t.closest('[data-hrrec-receber]'))) { abrirReceber(el.getAttribute('data-hrrec-receber')); return; }
    if ((el = t.closest('[data-rec-r]'))) { abrirReceber(el.getAttribute('data-rec-r')); return; }
    if ((el = t.closest('[data-rec-w]'))) { cobrar(el.getAttribute('data-rec-w')); return; }
    if ((el = t.closest('[data-rec-p]'))) { avisoPDF(el.getAttribute('data-rec-p')); return; }
    if ((el = t.closest('[data-rec-m]'))) { abrirMais(el.getAttribute('data-rec-m')); return; }
    if ((el = t.closest('[data-rec-cfg]'))) {
      var vinha = document.getElementById('hrRecLista');
      abrirCfg(vinha ? abrirLista : null); return;
    }
  }, true);

  // ── API pública (usada por app-agenda-v2.js) ──────────────────────
  window.HRRec = {
    calc: calc, lista: lista, faixa: faixa, tagCard: tagCard,
    abrirReceber: abrirReceber, abrirLista: abrirLista, semBot: semBot, perguntarLancar: perguntarLancar,
    cobrar: cobrar, avisoPDF: avisoPDF, abrirCfg: abrirCfg, receber: receber, lancar: lancar, corrigirRecebido: corrigirRecebido,
    sincBot: sincBot, payloadBot: payloadBot,
    botConfig: function (url, key) { window.HRRec._bot = { url: url, key: key }; sincBot(true); }
  };
  window.abrirAReceber = abrirLista;
})();
