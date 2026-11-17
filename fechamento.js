// ══════════════════════════════════════════════════════════════════
// FECHAMENTO.JS — Módulo de Fechamento de Venda (ERP Profissional)
// Fluxo: ORÇAMENTO → FECHAMENTO → FINANCEIRO → AGENDA
// ══════════════════════════════════════════════════════════════════

// ═══ ABRIR TELA DE FECHAMENTO ═══
function abrirFechamento() {
  if (!pendQ) { toast('Calcule um orçamento primeiro'); return; }

  var q = pendQ;
  var total = q.vista || 0;

  // Preenche campos iniciais
  document.getElementById('fchTotal').value = fm(total);
  document.getElementById('fchDesconto').value = '0,00';
  document.getElementById('fchEntrada').value = fm(total * 0.5);
  document.getElementById('fchParcelas').value = '1';
  document.getElementById('fchObs').value = '';
  document.getElementById('fchStatus').value = 'pendente';
  document.getElementById('fchFpag').value = 'dinheiro';
  document.getElementById('fchVenc').value = addD(td(), 30);
  document.getElementById('fchCli').textContent = q.cli || 'Cliente';
  document.getElementById('fchTipo').textContent = (q.tipo || '') + (q.mat ? ' — ' + q.mat : '');

  fchRecalcular();
  showMd('fechamentoMd');
}

// ═══ RECALCULAR SALDO ═══
function fchRecalcular() {
  var totalRaw = parseFloat((document.getElementById('fchTotal').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var descRaw  = parseFloat((document.getElementById('fchDesconto').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var entRaw   = parseFloat((document.getElementById('fchEntrada').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var parc     = Math.max(1, parseInt(document.getElementById('fchParcelas').value) || 1);

  var liquido  = Math.max(0, totalRaw - descRaw);
  var saldo    = Math.max(0, liquido - entRaw);
  var vlrParc  = parc > 0 ? saldo / parc : saldo;

  document.getElementById('fchLiquido').textContent  = 'R$ ' + fm(liquido);
  document.getElementById('fchSaldo').textContent    = 'R$ ' + fm(saldo);
  document.getElementById('fchVlrParc').textContent  = parc > 1 ? parc + 'x de R$ ' + fm(vlrParc) : 'R$ ' + fm(saldo);
}

// ═══ CONFIRMAR FECHAMENTO ═══
function confirmarFechamento() {
  if (!pendQ) { toast('Orçamento não encontrado'); return; }

  var q = pendQ;

  // Leitura dos campos
  var totalRaw = parseFloat((document.getElementById('fchTotal').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var descRaw  = parseFloat((document.getElementById('fchDesconto').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var entRaw   = parseFloat((document.getElementById('fchEntrada').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  var parc     = Math.max(1, parseInt(document.getElementById('fchParcelas').value) || 1);
  var fpag     = document.getElementById('fchFpag').value;
  var venc     = document.getElementById('fchVenc').value;
  var obs      = document.getElementById('fchObs').value.trim();
  var status   = document.getElementById('fchStatus').value;

  var liquido  = Math.max(0, totalRaw - descRaw);
  var saldo    = Math.max(0, liquido - entRaw);
  var vlrParc  = parc > 0 ? saldo / parc : saldo;

  // ── 1. REGISTRAR CONTAS NO FINANCEIRO ──
  var agora = Date.now();

  // Entrada (se houver)
  if (entRaw > 0) {
    DB.t.unshift({
      id: agora,
      type: status === 'pago' ? 'in' : 'pend',
      desc: 'Entrada — ' + escH(q.cli) + ' (' + (q.tipo || '') + ')',
      value: entRaw,
      date: td(),
      qid: q.id,
      fpag: fpag
    });
  }

  // Parcelas do saldo restante
  for (var i = 0; i < parc; i++) {
    var dtParc = addD(venc, i * 30);
    DB.t.unshift({
      id: agora + i + 1,
      type: 'pend',
      desc: 'Parcela ' + (i + 1) + '/' + parc + ' — ' + escH(q.cli),
      value: vlrParc,
      date: dtParc,
      qid: q.id,
      fpag: fpag
    });
  }

  // ── 2. CRIAR SERVIÇO NA AGENDA ──
  var last = lastEnd() || td();
  var prazo = 15; // dias úteis padrão
  var endDate = addD(last, prazo);

  var job = {
    id: agora + 1000,
    cli: q.cli,
    material: q.mat || '',
    mat: q.mat || '',
    tipo: q.tipo || 'Serviço',
    desc: (q.tipo || 'Serviço') + (q.mat ? ' — ' + q.mat : ''),
    start: last,
    end: endDate,
    value: liquido,
    pago: status === 'pago' ? liquido : entRaw,
    obs: obs,
    done: false,
    status: 'agendado',
    qid: q.id,
    fpag: fpag,
    parc: parc,
    entrada: entRaw,
    saldo: saldo
  };
  DB.j.unshift(job);

  // ── 3. ATUALIZAR STATUS DO ORÇAMENTO ──
  var orc = DB.q.find(function(x) { return x.id === q.id; });
  if (orc) {
    orc.fechado = true;
    orc.statusPag = status;
    orc.dtFechamento = td();
    orc.desconto = descRaw;
    orc.entrada = entRaw;
    orc.saldo = saldo;
    orc.parc = parc;
    orc.fpag = fpag;
    orc.obs = obs;
  }

  DB.sv();

  // ── AUTO-CRIAR BOLETOS ──
  if (typeof bFromFechamento === 'function') {
    // Entrada
    if (entRaw > 0) {
      bFromFechamento(q.cli, 'Entrada — ' + escH(q.cli||'') + ' (' + (q.tipo||'') + ')', entRaw, td(), '1/'+(parc+1), fpag, q.id);
    }
    // Parcelas do saldo
    for (var pi = 0; pi < parc; pi++) {
      var dtParci = addD(venc, pi * 30);
      bFromFechamento(q.cli, 'Parcela '+(pi+1)+'/'+parc+' — '+escH(q.cli||''), vlrParc, dtParci, (pi+1)+'/'+parc, fpag, q.id);
    }
    bUpdDot();
  }

  closeAll();
  updUrgDot();

  // Renderiza financeiro se estiver visível
  if (typeof renderFin === 'function') renderFin();

  toast('✅ Venda fechada! Financeiro e Agenda atualizados.');

  // Limpa pendQ
  pendQ = null;
}

// ═══ HELPER — escapar HTML ═══
function escH(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══ FORMATAR CAMPO MOEDA AO SAIR ═══
function fchFmtMoeda(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var raw = parseFloat((el.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  el.value = fm(raw);
  fchRecalcular();
}
