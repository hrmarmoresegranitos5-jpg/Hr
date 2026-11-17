// ── Toggle urgência no modal ──
var _jUrg = false;
function togJUrg() {
  _jUrg = !_jUrg;
  var btn = document.getElementById('jUrgBtn');
  var hint = document.getElementById('jUrgHint');
  var mot = document.getElementById('jUrgMotivo');
  if (_jUrg) {
    btn.textContent = '🚨 URGENTE';
    btn.classList.add('on');
    hint.textContent = 'Informe o motivo abaixo:';
    mot.style.display = 'block';
    mot.focus();
  } else {
    btn.textContent = '⚡ Normal';
    btn.classList.remove('on');
    hint.textContent = 'Sem prioridade especial';
    mot.style.display = 'none';
    mot.value = '';
  }
}

function _setUrg(val, motivo) {
  _jUrg = !!val;
  var btn = document.getElementById('jUrgBtn');
  var hint = document.getElementById('jUrgHint');
  var mot = document.getElementById('jUrgMotivo');
  if (!btn) return;
  if (_jUrg) {
    btn.textContent = '🚨 URGENTE';
    btn.classList.add('on');
    hint.textContent = 'Informe o motivo abaixo:';
    mot.style.display = 'block';
    mot.value = motivo || '';
  } else {
    btn.textContent = '⚡ Normal';
    btn.classList.remove('on');
    hint.textContent = 'Sem prioridade especial';
    mot.style.display = 'none';
    mot.value = '';
  }
}

function openJobModal(id) {
  editJobId = id;
  document.getElementById('jobMdTitle').textContent = id ? 'Editar Serviço' : 'Novo Serviço';
  if (id) {
    var j = DB.j.find(function(x) { return x.id === id; });
    if (!j) return;
    document.getElementById('jCli').value   = j.cli   || '';
    document.getElementById('jDesc').value  = j.desc  || '';
    document.getElementById('jStart').value = j.start || td();
    document.getElementById('jDias').value  = '';
    document.getElementById('jVal').value   = j.value || '';
    document.getElementById('jPago').value  = j.pago  || '';
    document.getElementById('jObs').value   = j.obs   || '';
    _setUrg(j.urgente, j.urgMotivo);
  } else {
    ['jCli','jDesc','jVal','jPago','jObs'].forEach(function(i) { document.getElementById(i).value = ''; });
    document.getElementById('jStart').value = td();
    document.getElementById('jDias').value  = '';
    _setUrg(false);
  }
  document.getElementById('jobDp').classList.remove('on');
  showMd('jobMd');
}

function prevJobDias() {
  var d = +document.getElementById('jDias').value;
  var s = document.getElementById('jStart').value;
  var p = document.getElementById('jobDp');
  if (!d || !s) { p.classList.remove('on'); return; }
  p.textContent = 'Entrega: ' + fd(addD(s, d));
  p.classList.add('on');
}

function saveJob() {
  var cli  = document.getElementById('jCli').value.trim();
  var desc = document.getElementById('jDesc').value.trim();
  if (!cli || !desc) { toast('Preencha cliente e descrição'); return; }
  var s    = document.getElementById('jStart').value;
  var d    = +document.getElementById('jDias').value || 0;
  var end  = d ? addD(s, d) : '';
  var val  = +document.getElementById('jVal').value  || 0;
  var pago = +document.getElementById('jPago').value || 0;
  var obs  = document.getElementById('jObs').value;
  var urg  = _jUrg;
  var urgM = (document.getElementById('jUrgMotivo').value || '').trim();

  if (editJobId) {
    var j = DB.j.find(function(x) { return x.id === editJobId; });
    if (j) {
      j.cli = cli; j.desc = desc; j.start = s; j.end = end;
      j.value = val; j.pago = pago; j.obs = obs;
      j.urgente = urg; j.urgMotivo = urgM;
      DB.sv();
    }
  } else {
    DB.j.unshift({ id: Date.now(), cli: cli, desc: desc, start: s, end: end,
      value: val, pago: pago, obs: obs, done: false, urgente: urg, urgMotivo: urgM });
    DB.sv();
    if (pago > 0) setTimeout(function() {
      showCB('Registrar entrada de R$ ' + fm(pago) + ' do ' + cli + '?',
        function() { addTr('in', 'Entrada — ' + cli, pago); hideCB(); },
        function() { hideCB(); });
    }, 400);
  }
  renderAg(); updUrgDot(); closeAll(); toast('✓ Salvo!');
}

function editJob(id) { openJobModal(id); }

function togJob(id) {
  var j = DB.j.find(function(x) { return x.id === id; });
  if (!j) return;
  j.done = !j.done;
  DB.sv(); renderAg(); updUrgDot();
  if (j.done) {
    toast('✓ Concluído!');
    var r = j.value - (j.pago || 0);
    if (r > 0) setTimeout(function() {
      showCB(j.cli + ' concluído! Recebeu R$ ' + fm(r) + ' da entrega?',
        function() { addTr('in', 'Entrega — ' + j.cli, r); j.pago = j.value; DB.sv(); renderAg(); hideCB(); toast('✓ Registrado!'); },
        function() { hideCB(); });
    }, 400);
  }
}

function pagRest(id) {
  var j = DB.j.find(function(x) { return x.id === id; });
  if (!j) return;
  var r = j.value - (j.pago || 0);
  showCB('Registrar R$ ' + fm(r) + ' do ' + j.cli + '?',
    function() { addTr('in', 'Pagamento — ' + j.cli, r); j.pago = j.value; DB.sv(); renderAg(); hideCB(); toast('✓ Registrado!'); },
    function() { hideCB(); });
}

function delJob(id) {
  if (!confirm('Remover serviço?')) return;
  DB.j = DB.j.filter(function(j) { return j.id !== id; });
  DB.sv(); renderAg(); updUrgDot();
}

function updUrgDot() {
  var u = DB.j.filter(function(j) {
    if (j.done) return false;
    var atrasado = j.end && dDiff(j.end) < 0;
    var quaseVencendo = j.end && dDiff(j.end) >= 0 && dDiff(j.end) <= 3;
    return atrasado || quaseVencendo || j.urgente;
  }).length;
  document.getElementById('urgDot').classList.toggle('on', u > 0);
}

// ── Ordenação: urgentes primeiro dentro de cada grupo ──
function _sortUrg(list) {
  return list.slice().sort(function(a, b) {
    if (a.urgente && !b.urgente) return -1;
    if (!a.urgente && b.urgente) return 1;
    return 0;
  });
}

function renderAg() {
  var hoje = td();
  var ov = DB.j.filter(function(j) { return !j.done && j.end && dDiff(j.end) < 0; });
  var ur = DB.j.filter(function(j) { return !j.done && j.end && dDiff(j.end) >= 0 && dDiff(j.end) <= 3; });
  // Urgentes que NÃO estão em atrasados nem próximos 3 dias
  var urgStd = DB.j.filter(function(j) {
    return !j.done && j.urgente && (!j.end || dDiff(j.end) > 3);
  });
  var pe = DB.j.filter(function(j) {
    return !j.done && !j.urgente && (!j.end || dDiff(j.end) > 3);
  });
  var dn = DB.j.filter(function(j) { return j.done; }).slice(0, 5);

  var h = '';

  // Resumo rápido no topo se houver urgências
  var totalUrg = ov.filter(function(j){return j.urgente;}).length
    + ur.filter(function(j){return j.urgente;}).length
    + urgStd.length;
  var totalAtras = ov.length;
  if (totalAtras > 0 || totalUrg > 0) {
    h += '<div style="display:flex;gap:7px;margin-bottom:4px;flex-wrap:wrap;">';
    if (totalAtras) h += '<div style="background:#1f0808;border:1px solid rgba(201,68,68,.35);border-radius:20px;padding:5px 11px;font-size:.65rem;color:var(--red);font-weight:700;">⚠️ ' + totalAtras + ' atrasado' + (totalAtras > 1 ? 's' : '') + '</div>';
    if (totalUrg) h += '<div style="background:#1a0d00;border:1px solid rgba(255,107,53,.35);border-radius:20px;padding:5px 11px;font-size:.65rem;color:#ff9060;font-weight:700;">🚨 ' + totalUrg + ' urgente' + (totalUrg > 1 ? 's' : '') + '</div>';
    h += '</div>';
  }

  function sec(lbl, col, items) {
    if (!items.length) return;
    h += '<div class="urg-section-lbl ' + col + '">' + lbl + '</div>';
    _sortUrg(items).forEach(function(j) { h += jCard(j); });
  }

  sec('Atrasados', 'red', ov);
  sec('🚨 Urgentes', 'red', urgStd);
  sec('Próximos 3 dias', 'gold', ur);
  sec('Em andamento (' + pe.length + ')', 't3', pe);
  sec('Concluídos', 'grn', dn);

  if (!DB.j.length) h = '<div style="text-align:center;padding:40px 20px;color:var(--t3);font-size:.82rem;"><div style="font-size:2.2rem;margin-bottom:9px;">📅</div>Nenhum serviço ainda.</div>';
  document.getElementById('agList').innerHTML = h;
}

function jCard(j) {
  var rest = j.value - (j.pago || 0);
  var d = j.end ? dDiff(j.end) : null;
  var isUrg = j.urgente && !j.done;
  var st = j.done ? 'done' : (isUrg ? 'urgente' : (d !== null && d <= 3 ? 'urg' : 'pend'));

  var dTxt = '';
  if (d !== null) {
    if (d < 0)      dTxt = '<span class="red">' + Math.abs(d) + 'd atrasado</span>';
    else if (d === 0) dTxt = '<span class="red">Hoje!</span>';
    else            dTxt = '<span>' + d + 'd restantes</span>';
  }

  var urgBadge = isUrg
    ? '<div class="urg-badge">🚨 URGENTE</div>'
      + (j.urgMotivo ? '<div class="urg-motivo">↳ ' + j.urgMotivo + '</div>' : '')
    : '';

  var meta = (j.start ? '<span>Início: ' + fd(j.start) + '</span> ' : '')
    + (j.end ? '<span>Entrega: ' + fd(j.end) + '</span> ' : '') + dTxt;

  var valMeta = j.value
    ? '<div class="jmeta"><span class="gold">Total: R$ ' + fm(j.value) + '</span>'
      + '<span class="grn">Pago: R$ ' + fm(j.pago || 0) + '</span>'
      + (rest > 0 ? '<span class="red">A receber: R$ ' + fm(rest) + '</span>' : '')
      + '</div>'
    : '';

  var btnPag = (!j.done && rest > 0)
    ? '<button class="btn btn-sm" style="background:var(--gdim);color:var(--gold2);border:1px solid var(--gold3);" data-pagrest="' + j.id + '">Receber</button>'
    : '';

  var urgTogBtn = !j.done
    ? '<button class="btn btn-sm" style="' + (isUrg ? 'background:#2a0808;color:#ff7070;border:1px solid rgba(201,68,68,.4);' : 'background:var(--s2);color:var(--t3);border:1px solid var(--bd2);') + '" data-editjob="' + j.id + '" onclick="event.stopPropagation();" title="Editar urgência">🚨</button>'
    : '';

  return '<div class="jcard ' + st + '">'
    + urgBadge
    + '<div class="jnm">' + j.cli + '</div>'
    + '<div class="jdesc">' + j.desc + '</div>'
    + '<div class="jmeta">' + meta + '</div>'
    + valMeta
    + '<div class="jbtns">'
      + '<button class="btn btn-sm ' + (j.done ? 'btn-o' : 'btn-grn') + '" data-togjob="' + j.id + '">' + (j.done ? '↩ Reabrir' : '✓ Concluir') + '</button>'
      + btnPag
      + '<button class="btn btn-sm btn-o" data-editjob="' + j.id + '">✏️</button>'
      + '<button class="btn btn-sm btn-red" data-deljob="' + j.id + '">✕</button>'
    + '</div>'
    + '</div>';
}
