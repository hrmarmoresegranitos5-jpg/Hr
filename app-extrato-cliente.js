// ══════════════════════════════════════════════════════════════
// app-extrato-cliente.js — v1.0
// Extrato Financeiro Consolidado por Cliente
// • Junta TODOS os serviços (DB.j) de um mesmo cliente — cozinha,
//   soleiras, área gourmet etc — cada um com seu próprio valor,
//   entrada paga e saldo em aberto.
// • Mostra o histórico de pagamentos (DB.t) do cliente.
// • Gera PDF no mesmo padrão visual dos PDFs do sistema
//   (faixa dourada, cabeçalho preto/dourado, html2canvas + jsPDF).
// • Pontos de entrada:
//   - Botão "📄 Extrato PDF" no rodapé do Perfil do Cliente
//   - Ícone "📄" em cada linha do Banco de Clientes
//   - window.gerarExtratoClientePDF(nome) — chamável de qualquer lugar
// ══════════════════════════════════════════════════════════════

(function () {
'use strict';

function _onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

// ─── Coleta os dados financeiros consolidados do cliente ───────
// Fonte principal: DB.j (Agenda) quando o serviço já foi agendado.
// Fallback: orçamentos aceitos/concluídos em DB.q que AINDA não têm
// registro em DB.j — isso acontece quando o modal "Dias de produção"
// (salvarAgenda → confirmarAgenda) foi fechado/ignorado sem confirmar
// o prazo. Nesse caso o dinheiro já está certo em Finanças e no
// orçamento (q.vista / q._valorRecebido), só falta aparecer aqui.
function _extDadosCliente(nome) {
  if (typeof _cliSim !== 'function') return null;

  var jobsAgenda = (DB.j || []).filter(function (j) { return _cliSim(nome, j.cli) >= 70; });
  var qIdsComAgenda = {};
  jobsAgenda.forEach(function (j) { if (j.qId) qIdsComAgenda[j.qId] = true; });

  var orcsFechados = (DB.q || []).filter(function (q) {
    return _cliSim(nome, q.cli) >= 70 &&
           (q.status === 'aceito' || q.status === 'concluido') &&
           !qIdsComAgenda[q.id];
  });

  var jobsDeOrc = orcsFechados.map(function (q) {
    return {
      id: 'q' + q.id, qId: q.id,
      desc: (q.tipo || 'Serviço') + (q.mat ? ' — ' + q.mat : ''),
      start: q._aceitoData || q._statusDate || q.date || null,
      end: q._concluidoData || null,
      value: q.vista || 0,
      pago: q._valorRecebido || 0,
      done: q.status === 'concluido',
      _semAgenda: true
    };
  });

  var jobs = jobsAgenda.concat(jobsDeOrc);
  // Ordem cronológica: mais antigo primeiro (ordem em que os serviços foram feitos)
  jobs.sort(function (a, b) {
    var da = a.start || '', db_ = b.start || '';
    if (da && db_) return da < db_ ? -1 : (da > db_ ? 1 : 0);
    return (a.id || 0) - (b.id || 0);
  });

  var pagamentos = (DB.t || []).filter(function (t) {
    return t.desc && typeof _cliNorm === 'function' &&
           _cliNorm(t.desc).indexOf(_cliNorm(nome)) !== -1;
  });
  pagamentos.sort(function (a, b) {
    var da = a.date || '', db_ = b.date || '';
    return da < db_ ? -1 : (da > db_ ? 1 : 0);
  });

  var totalContratado = jobs.reduce(function (s, j) { return s + (j.value || 0); }, 0);
  var totalPago = jobs.reduce(function (s, j) { return s + (j.pago || 0); }, 0);
  var saldoAberto = totalContratado - totalPago;

  var cliInfo = null;
  if (typeof _cliBuscar === 'function') {
    var m = _cliBuscar(nome, 70);
    if (m.length) cliInfo = m[0].c;
  }

  return {
    nome: nome, jobs: jobs, pagamentos: pagamentos,
    totalContratado: totalContratado, totalPago: totalPago, saldoAberto: saldoAberto,
    cliInfo: cliInfo
  };
}

function _extStatusJob(j) {
  var saldo = (j.value || 0) - (j.pago || 0);
  if ((j.value || 0) > 0 && saldo <= 0.005) {
    return { label: 'Quitado', cor: '#2e7d32', bg: 'rgba(46,125,50,0.1)' };
  }
  if ((j.pago || 0) > 0) {
    return { label: 'Entrada paga · Saldo pendente', cor: '#a06a00', bg: 'rgba(201,168,76,0.14)' };
  }
  return { label: 'Pendente de pagamento', cor: '#b23b3b', bg: 'rgba(178,59,59,0.1)' };
}

// ─── Gera o PDF do extrato ───────────────────────────────────
window.gerarExtratoClientePDF = function (nomeArg) {
  var nome = nomeArg || window._cpNomeAtual || '';
  if (!nome) { if (typeof toast === 'function') toast('Selecione um cliente'); return; }

  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    if (typeof toast === 'function') toast('Carregando bibliotecas PDF...');
    var s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s1.onload = function () {
      var s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload = function () { window.gerarExtratoClientePDF(nome); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return;
  }

  var d = _extDadosCliente(nome);
  if (!d || !d.jobs.length) {
    if (typeof toast === 'function') toast('Nenhum serviço encontrado para ' + nome);
    return;
  }

  var emp = (typeof CFG !== 'undefined' && CFG.emp) ? CFG.emp : { nome: 'HR Mármores e Granitos' };

  var extCount = parseInt(localStorage.getItem('hr_ext_count') || '0', 10);
  var extNum = 'EXT-' + String(extCount).padStart(4, '0');
  localStorage.setItem('hr_ext_count', extCount + 1);

  var fileName = 'Extrato_' + nome.replace(/[^a-zA-Z0-9]/g, '_') + '_' + td() + '.pdf';

  var clienteInfo = '';
  if (d.cliInfo && d.cliInfo.tel) clienteInfo += '<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#555;"><span style="color:#C9A84C;">&#128241;</span>' + escH(d.cliInfo.tel) + '</div>';
  if (d.cliInfo && d.cliInfo.cidade) clienteInfo += '<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#555;"><span style="color:#C9A84C;">&#128205;</span>' + escH(d.cliInfo.cidade) + '</div>';

  function sh(t) {
    return '<div style="display:flex;align-items:center;gap:10px;margin:0 0 14px;margin-top:4px;"><span style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:900;white-space:nowrap;">' + t + '</span><div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.35),transparent);"></div></div>';
  }

  // ── Cards de resumo ──
  var saldoCor = d.saldoAberto > 0.005 ? '#b23b3b' : '#2e7d32';
  var saldoTxt = d.saldoAberto > 0.005 ? 'R$ ' + fm(d.saldoAberto) : 'Quitado';
  var resumoHtml =
    '<div style="display:flex;gap:12px;margin-bottom:28px;">' +
      '<div style="flex:1;background:#fff;border:1px solid #EDE5CC;border-radius:10px;padding:14px 16px;text-align:center;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#999;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:6px;">Total Contratado</div>' +
        '<div style="font-size:18px;font-weight:700;color:#1a1a1a;">R$ ' + fm(d.totalContratado) + '</div>' +
      '</div>' +
      '<div style="flex:1;background:#fff;border:1px solid #EDE5CC;border-radius:10px;padding:14px 16px;text-align:center;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#999;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:6px;">Total Pago</div>' +
        '<div style="font-size:18px;font-weight:700;color:#2e7d32;">R$ ' + fm(d.totalPago) + '</div>' +
      '</div>' +
      '<div style="flex:1;background:#fff;border:1px solid #EDE5CC;border-radius:10px;padding:14px 16px;text-align:center;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#999;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:6px;">Saldo em Aberto</div>' +
        '<div style="font-size:18px;font-weight:700;color:' + saldoCor + ';">' + saldoTxt + '</div>' +
      '</div>' +
    '</div>';

  // ── Cards por serviço ──
  var jobsHtml = '';
  d.jobs.forEach(function (j, idx) {
    var st = _extStatusJob(j);
    var saldoJob = (j.value || 0) - (j.pago || 0);
    var periodo = '';
    if (j.start) periodo += fd(j.start);
    if (j.end) periodo += (periodo ? ' — ' : 'até ') + fd(j.end);

    jobsHtml +=
      '<div style="border:1px solid #EDE5CC;border-radius:10px;padding:16px 18px;margin-bottom:12px;position:relative;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">' +
          '<div>' +
            '<div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:3px;">Serviço ' + (idx + 1) + '</div>' +
            '<div style="font-size:15px;font-weight:700;color:#1a1a1a;">' + escH(j.desc || 'Serviço') + '</div>' +
            (periodo ? '<div style="font-size:10.5px;color:#999;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-top:2px;">' + periodo + '</div>' : '') +
            (j._semAgenda ? '<div style="font-size:9.5px;color:#a06a00;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-top:3px;">&#9888; Ainda n&atilde;o agendado na produ&ccedil;&atilde;o</div>' : '') +
          '</div>' +
          '<span style="font-size:8.5px;font-weight:700;letter-spacing:0.5px;padding:4px 10px;border-radius:20px;white-space:nowrap;font-family:\'Helvetica Neue\',Arial,sans-serif;background:' + st.bg + ';color:' + st.cor + ';">' + st.label + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:22px;font-family:\'Helvetica Neue\',Arial,sans-serif;">' +
          '<div><div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:2px;">Valor Total</div><div style="font-size:13px;font-weight:700;color:#1a1a1a;">R$ ' + fm(j.value || 0) + '</div></div>' +
          '<div><div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:2px;">Pago</div><div style="font-size:13px;font-weight:700;color:#2e7d32;">R$ ' + fm(j.pago || 0) + '</div></div>' +
          (saldoJob > 0.005 ? '<div><div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:2px;">Saldo</div><div style="font-size:13px;font-weight:700;color:#b23b3b;">R$ ' + fm(saldoJob) + '</div></div>' : '') +
        '</div>' +
      '</div>';
  });

  // ── Histórico de pagamentos ──
  var pagHtml = '';
  if (d.pagamentos.length) {
    d.pagamentos.forEach(function (t) {
      var isEntrada = t.type === 'in';
      pagHtml +=
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #EDE5CC;font-family:\'Helvetica Neue\',Arial,sans-serif;">' +
          '<div>' +
            '<div style="font-size:12px;font-weight:600;color:#1a1a1a;">' + escH(t.desc || '') + '</div>' +
            '<div style="font-size:9.5px;color:#999;">' + (t.date ? fd(t.date) : '') + '</div>' +
          '</div>' +
          '<div style="font-size:12.5px;font-weight:700;color:' + (isEntrada ? '#2e7d32' : (t.type === 'pend' ? '#a06a00' : '#b23b3b')) + ';">' + (isEntrada ? '+' : '') + 'R$ ' + fm(t.value || 0) + '</div>' +
        '</div>';
    });
  }

  var recHtml = ''
  + '<div id="extPdfReceipt" style="width:700px;font-family:Georgia,\'Times New Roman\',serif;background:#FAFAF8;color:#1a1a1a;position:relative;">'

  // ══ TOPO DOURADO ══
  + '<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  // ══ CABEÇALHO ══
  + '<div style="background:#0C0900;padding:32px 44px 28px;display:flex;justify-content:space-between;align-items:flex-end;">'
    + '<div>'
      + '<div style="font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:0.5px;line-height:1;margin-bottom:6px;">' + escH(emp.nome || '') + '</div>'
      + '<div style="font-size:7.5px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,168,76,0.38);font-family:\'Helvetica Neue\',Arial,sans-serif;">M&Aacute;RMORE &nbsp;&bull;&nbsp; GRANITO &nbsp;&bull;&nbsp; QUARTZITO</div>'
    + '</div>'
    + '<div style="text-align:right;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + '<div style="font-size:13px;color:#C9A84C;font-weight:600;letter-spacing:0.3px;margin-bottom:3px;">' + escH(emp.tel || '') + '</div>'
      + '<div style="font-size:9.5px;color:rgba(255,255,255,0.3);line-height:1.7;">' + escH(emp.end || '') + '</div>'
      + '<div style="font-size:9.5px;color:rgba(255,255,255,0.22);">' + escH(emp.cidade || '') + '</div>'
    + '</div>'
  + '</div>'

  // ══ FAIXA DO DOCUMENTO ══
  + '<div style="background:#1A1400;padding:10px 44px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(201,168,76,0.15);border-bottom:1px solid rgba(201,168,76,0.15);">'
    + '<div style="display:flex;align-items:center;gap:16px;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + '<div style="font-size:7px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:600;">Extrato Financeiro</div>'
      + '<div style="width:1px;height:12px;background:rgba(201,168,76,0.2);"></div>'
      + '<div style="font-size:9px;font-weight:700;color:#C9A84C;letter-spacing:1px;">' + extNum + '</div>'
    + '</div>'
    + '<div style="text-align:right;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + '<span style="font-size:9px;color:rgba(255,255,255,0.3);">Emiss&atilde;o: </span>'
      + '<span style="font-size:9px;color:rgba(201,168,76,0.65);font-weight:600;">' + fd(td()) + '</span>'
    + '</div>'
  + '</div>'

  // ══ CORPO ══
  + '<div style="padding:36px 44px 32px;background:#FAFAF8;">'

    + '<div style="margin-bottom:24px;">'
      + '<div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:600;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:8px;">Situa&ccedil;&atilde;o de</div>'
      + '<div style="font-size:26px;font-weight:700;color:#0C0900;line-height:1;letter-spacing:-0.3px;">' + escH(nome) + '</div>'
      + (clienteInfo ? '<div style="display:flex;flex-wrap:wrap;gap:4px 20px;margin-top:8px;font-family:\'Helvetica Neue\',Arial,sans-serif;">' + clienteInfo + '</div>' : '')
    + '</div>'

    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">'
      + '<div style="height:1px;flex:1;background:linear-gradient(90deg,#C9A84C,rgba(201,168,76,0.08));"></div>'
      + '<div style="width:4px;height:4px;background:#C9A84C;transform:rotate(45deg);flex-shrink:0;"></div>'
    + '</div>'

    + resumoHtml

    + '<div style="margin-bottom:8px;">'
      + sh('Servi&ccedil;os Contratados')
      + jobsHtml
    + '</div>'

    + (pagHtml ? '<div style="margin-top:24px;">' + sh('Hist&oacute;rico de Pagamentos') + pagHtml + '</div>' : '')

    + '<div style="margin-top:28px;background:#fffbf0;border-left:3px solid #C9A84C;padding:12px 16px;font-size:11.5px;color:#555;border-radius:0 8px 8px 0;line-height:1.65;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + (d.saldoAberto > 0.005
          ? 'Saldo total em aberto de <strong style="color:#b23b3b;">R$ ' + fm(d.saldoAberto) + '</strong> considerando todos os servi&ccedil;os acima.'
          : '<strong style="color:#2e7d32;">Todos os servi&ccedil;os listados est&atilde;o quitados.</strong>')
    + '</div>'

  + '</div>'

  // ══ BASE DOURADA ══
  + '<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  + '</div>';

  // ── Overlay ──
  var ov = document.createElement('div');
  ov.id = 'extPdfOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;';

  var barEl = document.createElement('div');
  barEl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid rgba(201,168,76,.55);flex-shrink:0;flex-wrap:wrap;';
  barEl.innerHTML = ''
    + '<span style="flex:1;font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">&#128196; ' + extNum + ' &mdash; ' + escH(nome) + '</span>'
    + '<button id="extBtnClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">&#x2715;</button>'
    + '<button id="extBtnDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#9203; Gerando...</button>'
    + (navigator.share ? '<button id="extBtnShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#8599; Compartilhar</button>' : '')
    + '<button id="extBtnPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#128424; Imprimir</button>';

  var preview = document.createElement('div');
  preview.style.cssText = 'flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML = '<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">&#9203; Gerando PDF, aguarde...</div>';

  ov.appendChild(barEl);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  document.getElementById('extBtnClose').onclick = function () { ov.remove(); };
  document.getElementById('extBtnPrint').onclick = function () {
    var w = window.open('', '_blank');
    if (w) {
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}</style></head><body>' + recHtml + '<script>window.onload=function(){window.print();};<\/script></body></html>');
      w.document.close();
    }
  };

  var offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#fff;z-index:-1;';
  offscreen.innerHTML = recHtml;
  document.body.appendChild(offscreen);

  setTimeout(function () {
    html2canvas(offscreen.querySelector('#extPdfReceipt'), {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: 700, windowWidth: 700
    }).then(function (canvas) {
      document.body.removeChild(offscreen);
      var jsPDF = window.jspdf.jsPDF;
      var pageW = 595.28;
      var pageH = pageW * (canvas.height / canvas.width);
      var pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pageW, pageH] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, pageW, pageH);
      var pdfBlob = pdf.output('blob');

      var img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg', 0.88);
      img.style.cssText = 'width:100%;max-width:700px;display:block;box-shadow:0 4px 32px rgba(0,0,0,.6);';
      preview.innerHTML = ''; preview.appendChild(img);

      function enableBtn(id, label, cb) {
        var b = document.getElementById(id); if (!b) return;
        b.innerHTML = label; b.disabled = false;
        b.style.color = '#C9A84C'; b.style.borderColor = 'rgba(201,168,76,.55)'; b.style.background = '#1e1800';
        b.onclick = cb;
      }

      enableBtn('extBtnDown', '&#11015; Salvar PDF', function () {
        var url = URL.createObjectURL(pdfBlob);
        var a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        if (typeof toast === 'function') toast('PDF salvo: ' + fileName);
      });

      if (navigator.share) {
        enableBtn('extBtnShare', '&#8599; Compartilhar', function () {
          var pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          var sd = { title: 'Extrato ' + extNum + ' — ' + nome, text: (emp.nome || '') + '\nSaldo em aberto: R$ ' + fm(d.saldoAberto) };
          if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) sd.files = [pdfFile];
          navigator.share(sd).catch(function () {});
        });
      }
    });
  }, 60);
};

// ─── Integração: botão no rodapé do Perfil do Cliente ──────────
function _patchPerfilFooter() {
  if (typeof window.CP !== 'object' || !window.CP.abrir || window._extCPPatched) return;
  window._extCPPatched = true;
  var _origAbrir = window.CP.abrir;
  window.CP.abrir = function (nome) {
    _origAbrir(nome);
    setTimeout(function () {
      var footer = document.querySelector('#cliPerfilPanel .cp-footer');
      if (!footer || footer.querySelector('.ext-cp-btn')) return;
      var btn = document.createElement('button');
      btn.className = 'btn ext-cp-btn';
      btn.style.cssText = 'background:transparent;border:1px solid rgba(201,168,76,.5);color:#C9A84C;';
      btn.textContent = '📄 Extrato PDF';
      btn.onclick = function () { gerarExtratoClientePDF(nome); };
      footer.insertBefore(btn, footer.firstChild);
    }, 30);
  };
}

// ─── Integração: ícone na lista do Banco de Clientes ────────────
function _patchListaClientes() {
  if (typeof window.renderListaClientes !== 'function' || window._extListaPatched) return;
  window._extListaPatched = true;
  var _orig = window.renderListaClientes;
  window.renderListaClientes = function (q) {
    _orig(q);
    var el = document.getElementById('cliLista');
    if (!el || typeof CLDB === 'undefined') return;
    var list = CLDB.get();
    var fil = q ? list.filter(function (c) { return _cliSim(q, c.nome) >= 30; }) : list;
    var rows = el.children;
    for (var i = 0; i < rows.length && i < fil.length; i++) {
      var row = rows[i];
      if (row.querySelector('.ext-row-btn')) continue;
      var c = fil[i];
      var btn = document.createElement('button');
      btn.className = 'ext-row-btn';
      btn.textContent = '📄';
      btn.title = 'Gerar extrato financeiro';
      btn.style.cssText = 'flex-shrink:0;background:transparent;border:1px solid rgba(201,168,76,.4);color:#C9A84C;width:30px;height:30px;border-radius:8px;font-size:.85rem;cursor:pointer;margin-left:2px;';
      btn.onclick = (function (nome) {
        return function (e) { e.stopPropagation(); gerarExtratoClientePDF(nome); };
      })(c.nome);
      row.appendChild(btn);
    }
  };
}

// ─── Botão no cabeçalho: abre o Banco de Clientes de qualquer tela ─
// (esse painel existia pronto no código mas não tinha nenhum
// botão na interface que levasse até ele. Usa o mesmo estilo do
// botão de cadeado #btnAdm já existente no header, em vez de um
// FAB flutuante por cima do conteúdo.)
function _injetarBtnHeaderClientes() {
  if (document.getElementById('extBtnHdrClientes')) return;
  var admBtn = document.getElementById('btnAdm');
  if (!admBtn || !admBtn.parentNode) return;
  var btn = document.createElement('button');
  btn.id = 'extBtnHdrClientes';
  btn.innerHTML = '👥';
  btn.title = 'Banco de Clientes';
  btn.style.cssText = admBtn.getAttribute('style') || 'background:transparent;border:1px solid var(--bd);border-radius:9px;padding:6px 9px;font-size:1rem;cursor:pointer;color:var(--t3);flex-shrink:0;line-height:1;';
  btn.onclick = function () {
    if (typeof abrirGestaoClientes === 'function') {
      abrirGestaoClientes();
    } else if (typeof toast === 'function') {
      toast('Módulo de clientes ainda não carregado, tente novamente');
    }
  };
  admBtn.parentNode.insertBefore(btn, admBtn);
}

function _tentarPatches() {
  _patchPerfilFooter();
  _patchListaClientes();
  _injetarBtnHeaderClientes();
  if (!window._extCPPatched || !window._extListaPatched || !document.getElementById('extBtnHdrClientes')) {
    setTimeout(_tentarPatches, 400);
  }
}

_onReady(function () { setTimeout(_tentarPatches, 200); });

})();
