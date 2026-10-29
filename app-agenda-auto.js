// ═══════════════════════════════════════════════════════════════════
// HR Mármores — AGENDA INTELIGENTE (app-agenda-auto.js)
//  1. Resgata orçamentos aceitos que ficaram sem agenda
//  2. Contrato usa as mesmas datas da agenda
//  3. Data única: agenda ↔ orçamento ↔ visita de medição sempre iguais
//  5. Visita de medição automática + aviso no dia de iniciar a obra
//  6. Fila inteligente: adianta / reorganiza quando algo termina ou atrasa
//     + "Como estamos?" diário da secretária (resposta por botão ou texto)
// Carregar DEPOIS de app-core.js, app-secretaria*.js e app-agenda-v2.js
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrAgendaAuto) return;
  window.__hrAgendaAuto = true;

  // ── utilitários ────────────────────────────────────────────────
  function hoje() { return td(); }
  function pd(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function diff(a, b) { return Math.round((pd(b) - pd(a)) / 86400000); }
  function add(iso, n) { return addD(iso, n); }
  function maxd(a, b) { return a > b ? a : b; }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function fdb(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : '—'; }
  function primeiroNome(n) {
    var p = String(n || '').trim().split(/\s+/)[0] || '';
    return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
  }
  function jobsAtivos() { return (DB.j || []).filter(function (j) { return j && !j.done && j.start && j.end; }); }
  function achaJobPorId(id) { return (DB.j || []).find(function (j) { return String(j.id) === String(id); }); }
  function achaQ(id) { return (DB.q || []).find(function (x) { return String(x.id) === String(id); }); }
  function etapaDe(j) { return j.stage || 'producao'; }
  function logJob(j, campo, de, para) {
    try { if (typeof _jobLog === 'function') _jobLog(j, campo, de, para); } catch (e) {}
  }
  function salvar() {
    try { DB.sv(); } catch (e) { console.error('hr-auto salvar:', e); }
    try { if (typeof renderAg === 'function') renderAg(); } catch (e) {}
    try { if (typeof updUrgDot === 'function') updUrgDot(); } catch (e) {}
  }

  // ── número do projeto (estável) ────────────────────────────────
  function projNum(q) {
    if (!q) return '';
    if (q.orcNum) return q.orcNum;
    if (!q.projNum) {
      var n = 1;
      try { n = parseInt(localStorage.getItem('hr_proj_seq') || '0', 10) + 1; localStorage.setItem('hr_proj_seq', n); } catch (e) {}
      q.projNum = 'PROJ-' + String(n).padStart(4, '0');
    }
    return q.projNum;
  }
  window.hrProjNum = projNum;

  // ═════════════════════════════════════════════════════════════
  //  VISITA DE MEDIÇÃO + SINCRONIZAÇÃO DE DATAS (3 e 5)
  // ═════════════════════════════════════════════════════════════
  function temVisita(j) {
    return (typeof _getV === 'function' ? _getV() : []).some(function (v) { return String(v.jobId) === String(j.id); });
  }
  function criarVisitaMedicao(j, q) {
    if (typeof _getV !== 'function' || temVisita(j)) return;
    var end = [q.end, q.cidade].filter(Boolean).join(' — ');
    _getV().unshift({
      id: Date.now() + Math.floor(Math.random() * 1000), cli: j.cli, tel: j.tel || q.tel || '', end: end,
      date: j.start, hora: '',
      obs: '📐 Conferir as medidas na casa do cliente — projeto ' + projNum(q) + ' (' + (j.desc || '') + ')',
      status: 'agendada', auto: true, jobId: j.id, qId: q.id
    });
    if (typeof _saveV === 'function') _saveV();
    try { if (typeof secNotifDotUpdate === 'function') secNotifDotUpdate(); } catch (e) {}
  }
  function acompanharVisita(j) {
    if (typeof _getV !== 'function') return;
    var mudou = false;
    _getV().forEach(function (v) {
      if (v.auto && String(v.jobId) === String(j.id) && v.status === 'agendada' && !j.medido && j.start && v.date !== j.start) {
        v.date = j.start; mudou = true;
      }
    });
    if (mudou && typeof _saveV === 'function') _saveV();
  }

  var _sincronizando = false;
  function sincronizar() {
    if (_sincronizando) return;
    _sincronizando = true;
    try {
      var h = hoje(), jobs = DB.j || [], qs = DB.q || [];
      jobs.forEach(function (j) {
        if (j && !j.done && j.end && !j.promessa) j.promessa = j.end;     // data prometida ao cliente (base do "risco de atraso")
        if (!j || !j.qId) return;
        var q = qs.find(function (x) { return String(x.id) === String(j.qId); });
        if (!q) return;
        if (!j.done && !j.mat && !j.material && q.mat) j.mat = q.mat;   // serviços agendados pelo aceite só traziam a pedra dentro da descrição
        if (j.start && j.end && !j.done) {
          if (q.prazoInicio !== j.start) q.prazoInicio = j.start;
          if (q.prazoEntrega !== j.end) q.prazoEntrega = j.end;
          var d = diff(j.start, j.end);
          if (d > 0 && q.prazoDias !== d) q.prazoDias = d;
        }
        if (!j.done && !j._auto) {
          j._auto = true;
          if (!j.proj) j.proj = projNum(q);
          if (!j.tel && q.tel) j.tel = q.tel;
          if (j.start >= h) criarVisitaMedicao(j, q);
        } else if (!j.done) {
          acompanharVisita(j);
        }
      });
    } catch (e) { console.error('hr-auto sincronizar:', e); }
    _sincronizando = false;
  }
  window.hrSincronizar = sincronizar;

  // Roda a sincronização sempre que o app salva
  (function envolverSv() {
    try {
      if (!DB || typeof DB.sv !== 'function' || DB.sv.__hrAuto) return;
      var orig = DB.sv;
      DB.sv = function () { sincronizar(); return orig.apply(this, arguments); };
      DB.sv.__hrAuto = true;
    } catch (e) { console.error('hr-auto envolverSv:', e); }
  })();

  // Medição conferida
  window.hrMedicaoFeita = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    j.medido = true; j.medidoEm = hoje();
    if (typeof _getV === 'function') {
      _getV().forEach(function (v) { if (String(v.jobId) === String(j.id) && v.status === 'agendada') v.status = 'realizada'; });
      if (typeof _saveV === 'function') _saveV();
    }
    salvar();
    toast('📐 Medidas conferidas — ' + j.cli);
  };

  // ═════════════════════════════════════════════════════════════
  //  ACEITOS SEM AGENDA (1)
  // ═════════════════════════════════════════════════════════════
  function aceitosSemAgenda() {
    var h = hoje(), limite = add(h, -60);
    return (DB.q || []).filter(function (q) {
      if (!q || q.agendaDispensada) return false;
      var st = q.status === 'aprovado' ? 'aceito' : q.status;
      if (st !== 'aceito') return false;
      var ref = q._aceitoData || q._statusDate || q.date || '';
      if (ref && ref < limite) return false;
      return !(DB.j || []).some(function (j) { return String(j.qId) === String(q.id); });
    });
  }
  window.hrAceitosSemAgenda = aceitosSemAgenda;

  window.hrAgendarQ = function (id) {
    var q = achaQ(id); if (!q) return;
    var ok = false;
    try { ok = _agendarAposAceite(q); } catch (e) { ok = false; }
    if (!ok) { pendQ = q; try { salvarAgenda(); } catch (e) { toast('Não consegui abrir o agendamento'); } }
    else setTimeout(function () { try { renderAg(); } catch (e) {} }, 200);
  };
  window.hrDispensarAgenda = function (id) {
    var q = achaQ(id); if (!q) return;
    q.agendaDispensada = true; salvar(); toast('Ok — não aviso mais sobre ' + q.cli);
  };
  window.hrAgendarTodos = function () {
    var lista = aceitosSemAgenda(), feitos = 0, manuais = 0;
    lista.forEach(function (q) {
      var tem = (+q.prazoDias > 0) || (q.prazoInicio && q.prazoEntrega);
      var venc = false;
      try { venc = (typeof _orcVencido === 'function') && _orcVencido(q) && !(q._aceitoData && _orcValidoAte(q) && q._aceitoData <= _orcValidoAte(q)); } catch (e) {}
      if (tem && !venc) { try { if (_agendarAposAceite(q)) feitos++; else manuais++; } catch (e) { manuais++; } }
      else manuais++;
    });
    salvar();
    toast('📅 ' + feitos + ' agendado(s)' + (manuais ? ' · ' + manuais + ' precisa(m) de prazo (toque em Agendar)' : ''));
  };

  // Ao aceitar/agendar, o serviço novo já entra no melhor lugar da fila (fim de semana, instalação, pedra).
  // Só mexe no serviço novo — nunca desloca os outros sem você ver (isso fica nas sugestões).
  function envolverAgendar() {
    if (typeof window._agendarAposAceite !== 'function' || window._agendarAposAceite.__hrAuto) return;
    var orig = window._agendarAposAceite;
    window._agendarAposAceite = function (q) {
      var tinha = q && (DB.j || []).some(function (x) { return String(x.qId) === String(q.id); });
      var r = orig.apply(this, arguments);
      try {
        if (r && q && !tinha) {
          var j = (DB.j || []).find(function (x) { return String(x.qId) === String(q.id) && !x.done; });
          if (j) {
            if (!j.mat && !j.material && q.mat) j.mat = q.mat;
            if (!j.urgente && !(q.prazoUrgente || (q.urgPct || 0) > 0) && typeof window.hrPlanoFila === 'function') {
              var mud = window.hrPlanoFila();
              if (mud.length === 1 && mud[0].job === j) { aplicarPlano(mud); j._encaixado = true; } else { DB.sv(); }
            }
            j.promessa = j.end;
            // confirmação pronta para o cliente (um toque; o app não envia sozinho)
            responderChat('✅ **' + j.cli + '** agendado: início **' + fdb(j.start) + '** · entrega **' + fdb(j.end) + '**' +
              (j._encaixado ? ' (encaixado na fila)' : '') + '.\nQuer confirmar o pedido com o cliente?',
              [{ label: '💬 Confirmar com ' + primeiroNome(j.cli), fn: 'hrAvisarCliente(' + JSON.stringify(String(j.id)) + ",'confirmar','" + j.start + "','" + j.end + "')" }]);
            delete j._encaixado;
          }
        }
      } catch (e) { console.warn('hr-auto agendar:', e); }
      return r;
    };
    window._agendarAposAceite.__hrAuto = true;
  }

  // ═════════════════════════════════════════════════════════════
  //  FILA INTELIGENTE (6)
  // ═════════════════════════════════════════════════════════════
  // ── calendário de trabalho (sábado opcional; domingo nunca) ────
  var _cfgRaw = null, _cfgVal = null;
  function cfgFila() {
    var raw = ''; try { raw = localStorage.getItem('hr_fila_cfg') || ''; } catch (e) {}
    if (_cfgVal && raw === _cfgRaw) return _cfgVal;
    var c = {}; try { c = JSON.parse(raw || '{}') || {}; } catch (e) {}
    _cfgRaw = raw;
    _cfgVal = {
      sabado: !!c.sabado,
      instDias: (c.instDias >= 0 && c.instDias !== '' && c.instDias != null) ? +c.instDias : 1,
      facultativos: c.facultativos !== false,                       // Carnaval e Corpus Christi como folga
      extras: Array.isArray(c.extras) ? c.extras.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }) : []
    };
    return _cfgVal;
  }
  function salvarCfgFila(c) { try { localStorage.setItem('hr_fila_cfg', JSON.stringify(c)); } catch (e) {} _cfgRaw = null; }
  function dow(iso) { return new Date(pd(iso)).getUTCDay(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pascoa(y) {   // algoritmo de Meeus/Jones/Butcher
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + pad2(mes) + '-' + pad2(dia);
  }
  var _ferCache = {};
  function feriadosDoAno(y, fac) {
    var k = y + (fac ? 'f' : 'n'); if (_ferCache[k]) return _ferCache[k];
    var o = {}, p = pascoa(y);
    ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].forEach(function (md) { o[y + '-' + md] = 1; });
    o[add(p, -2)] = 1;                                              // Sexta-feira Santa
    if (fac) { o[add(p, -48)] = 1; o[add(p, -47)] = 1; o[add(p, 60)] = 1; }   // Carnaval (seg e ter) e Corpus Christi
    _ferCache[k] = o; return o;
  }
  function feriado(iso) { var c = cfgFila(); return !!(feriadosDoAno(+String(iso).slice(0, 4), c.facultativos)[iso] || c.extras.indexOf(iso) >= 0); }
  function util(iso) { var w = dow(iso); return !(w === 0 || (w === 6 && !cfgFila().sabado) || feriado(iso)); }
  function proxUtil(iso) { var i = iso, n = 0; while (!util(i) && n < 10) { i = add(i, 1); n++; } return i; }
  function somaUteis(iso, n) { var i = proxUtil(iso); while (n > 0) { i = proxUtil(add(i, 1)); n--; } return i; }
  function subUteis(iso, n) { var i = iso, g = 0; while (n > 0 && g < 60) { i = add(i, -1); g++; if (util(i)) n--; } return i; }
  function uteisEntre(a, b) { var n = 0, i = a, g = 0; while (i < b && g < 400) { i = add(i, 1); g++; if (util(i)) n++; } return n; }
  function instDias(j) { return j.instala ? (j.instDias >= 0 && j.instDias != null && j.instDias !== '' ? +j.instDias : cfgFila().instDias) : 0; }
  window.hrCalUteis = { feriado: feriado, util: util, proxUtil: proxUtil, somaUteis: somaUteis, uteisEntre: uteisEntre };

  // ── material (pedra) ───────────────────────────────────────────
  function semPedra(j, h) {   // não pode começar: pedra ainda não chegou OU obra do cliente ainda não liberou
    if (etapaDe(j) !== 'producao' || j.oficinaFim) return false;
    return !!((j.matChega && !j.matOk && j.matChega > h) || (j.clienteAte && j.clienteAte > h));
  }
  function dataPedra(j, h) { return (j.matChega && !j.matOk) ? j.matChega : ''; }
  function dataCliente(j, h) { return (j.clienteAte && j.clienteAte > h) ? j.clienteAte : ''; }
  function dataBloqueio(j, h) { return maxd(dataPedra(j, h), dataCliente(j, h)); }

  function jaComecou(j, h) {
    if (etapaDe(j) !== 'producao') return true;
    if (semPedra(j, h)) return false;               // sem pedra não começou, mesmo que a data já tenha passado
    return j.start <= h;
  }
  // dia em que a OFICINA fica livre (a instalação é feita em campo e não segura a oficina)
  function fabFim(j, endRef) {
    if (j.oficinaFim) return j.oficinaFim;
    var e = endRef || j.end, f = j.instala ? subUteis(e, instDias(j)) : e;
    return f < j.start ? j.start : f;
  }
  function ocupaAte(j, h) {
    if (etapaDe(j) !== 'producao') return h;
    return maxd(fabFim(j), h);
  }

  // Calcula como a fila deveria ficar. Não altera nada.
  function planoFila() {
    var h = hoje(), cursor = h;
    var ativos = jobsAtivos();
    ativos.forEach(function (j) {                    // quem já está em produção segura a oficina (urgente não segura)
      if (jaComecou(j, h) && !j.urgente) cursor = maxd(cursor, ocupaAte(j, h));
    });
    var pend = ativos.filter(function (j) { return !jaComecou(j, h); });
    var mud = [];
    while (pend.length) {
      var melhor = null, melhorPoss = null;
      pend.forEach(function (j) {                    // escolhe quem pode começar primeiro (urgente e data original desempatam)
        var poss = j.fixo ? j.start : proxUtil(maxd(maxd(h, cursor), dataBloqueio(j, h) || h));
        var ganha = !melhor || poss < melhorPoss ||
          (poss === melhorPoss && ((j.urgente ? 0 : 1) < (melhor.urgente ? 0 : 1) ||
            ((j.urgente ? 0 : 1) === (melhor.urgente ? 0 : 1) && (j.start < melhor.start || (j.start === melhor.start && String(j.id) < String(melhor.id))))));
        if (ganha) { melhor = j; melhorPoss = poss; }
      });
      var j = melhor;
      pend.splice(pend.indexOf(j), 1);
      if (j.fixo) { cursor = maxd(cursor, fabFim(j)); continue; }
      var inst = instDias(j);
      var wd = Math.max(1, uteisEntre(j.start, j.end));
      var fab = j.instala ? Math.max(1, wd - inst) : wd;
      var ns = melhorPoss, ne, fimOf;
      var cursorAntes = maxd(h, cursor), pedra = dataBloqueio(j, h);
      if (ns === j.start) { ne = j.end; fimOf = fabFim(j); }
      else { fimOf = somaUteis(ns, fab); ne = j.instala ? somaUteis(fimOf, inst) : fimOf; }
      cursor = maxd(cursor, fimOf);
      if (ns !== j.start) {
        mud.push({
          job: j, de: { s: j.start, e: j.end }, para: { s: ns, e: ne }, tipo: ns < j.start ? 'adiantar' : 'atrasar',
          motivo: (pedra && pedra > cursorAntes) ? (dataCliente(j, h) === pedra ? 'cliente' : 'material') : 'fila'
        });
      }
    }
    planoFila._cursor = cursor;   // dia em que a oficina fica livre depois de toda a fila (usado no prazo possível)
    return mud;
  }
  window.hrPlanoFila = planoFila;

  function guardarDesfazer(mud) {
    try {
      localStorage.setItem('hr_plano_undo', JSON.stringify({
        em: hoje(), itens: mud.map(function (m) { return { id: m.job.id, s: m.de.s, e: m.de.e }; })
      }));
    } catch (e) {}
  }
  function aplicarPlano(mud) {
    if (!mud || !mud.length) return;
    guardarDesfazer(mud);
    mud.forEach(function (m) {
      logJob(m.job, 'prazo', fdb(m.de.s) + '→' + fdb(m.de.e), fdb(m.para.s) + '→' + fdb(m.para.e));
      m.job.start = m.para.s; m.job.end = m.para.e; m.job._reagendado = hoje();
    });
    salvar();
  }
  window.hrDesfazerPlano = function () {
    try {
      var u = JSON.parse(localStorage.getItem('hr_plano_undo') || 'null');
      if (!u || !u.itens || !u.itens.length) { toast('Nada para desfazer'); return; }
      u.itens.forEach(function (it) { var j = achaJobPorId(it.id); if (j) { j.start = it.s; j.end = it.e; } });
      localStorage.removeItem('hr_plano_undo');
      salvar(); toast('↩️ Datas anteriores restauradas');
    } catch (e) { toast('Não consegui desfazer'); }
  };

  // Mensagem de WhatsApp para o cliente afetado
  function textoCliente(j, m) {
    var nome = primeiroNome(j.cli);
    if (m.tipo === 'atraso') {
      return 'Olá, ' + nome + '! Passando para avisar com antecedência: a previsão de entrega do seu serviço mudou para ' + fdb(m.para.e) +
        '. Pedimos desculpas pelo transtorno e estamos fazendo o possível para entregar o quanto antes. — HR Mármores e Granitos';
    }
    if (m.tipo === 'confirmar') {
      return 'Olá, ' + nome + '! Seu pedido está confirmado. Início previsto: ' + fdb(m.para.s) + ' · entrega prevista: ' + fdb(m.para.e) +
        '. Antes de começar, vamos passar aí para conferir as medidas. Qualquer dúvida é só chamar. — HR Mármores e Granitos';
    }
    if (m.tipo === 'adiantar') {
      return 'Olá, ' + nome + '! Boa notícia: conseguimos adiantar o seu serviço. Início previsto para ' + fdb(m.para.s) +
        ' e entrega prevista para ' + fdb(m.para.e) + '. Qualquer dúvida é só chamar. — HR Mármores e Granitos';
    }
    return 'Olá, ' + nome + '! Passando para avisar que a agenda da produção sofreu um ajuste. A nova previsão do seu serviço é: início ' +
      fdb(m.para.s) + ' e entrega ' + fdb(m.para.e) + '. Pedimos desculpas pelo transtorno e seguimos à disposição. — HR Mármores e Granitos';
  }
  window.hrAvisarCliente = function (jobId, tipo, ps, pe) {
    var j = achaJobPorId(jobId); if (!j) return;
    var q = j.qId ? achaQ(j.qId) : null;
    var txt = textoCliente(j, { tipo: tipo, para: { s: ps, e: pe } });
    var tel = j.tel || (q && q.tel) || '';
    if (typeof _dashAbrirZap === 'function') _dashAbrirZap(tel, txt);
    else {
      var num = String(tel).replace(/\D/g, ''); if (num && num.length <= 11) num = '55' + num;
      window.open((num ? 'https://wa.me/' + num : 'https://wa.me/') + '?text=' + encodeURIComponent(txt), '_blank');
    }
  };

  function descreverMudancas(mud) {
    var linhas = [], acoes = [];
    mud.forEach(function (m) {
      var ic = m.tipo === 'adiantar' ? '⏩ Adiantei' : '⏳ Empurrei';
      linhas.push(ic + ' **' + m.job.cli + '**: início ' + fdb(m.de.s) + ' → **' + fdb(m.para.s) + '** · entrega ' + fdb(m.de.e) + ' → **' + fdb(m.para.e) + '**' +
        (m.motivo === 'material' ? '\n   🪨 aguardando a pedra' : m.motivo === 'cliente' ? '\n   ⏸️ aguardando o cliente liberar a obra' : '') +
        (m.tipo === 'adiantar' ? '\n   📐 conferir as medidas na casa do cliente antes de começar' : ''));
      acoes.push({
        label: '💬 Avisar ' + primeiroNome(m.job.cli),
        fn: "hrAvisarCliente(" + JSON.stringify(String(m.job.id)) + ",'" + m.tipo + "','" + m.para.s + "','" + m.para.e + "')"
      });
    });
    return { texto: linhas.join('\n'), acoes: acoes };
  }

  // Relato de andamento (botão, texto ou IA). etapa: corte | pronto | previsao | atraso
  window.hrAndamento = function (jobId, etapa, valor, opcoes) {
    var j = achaJobPorId(jobId);
    if (!j) { return { ok: false, texto: '⚠️ Não encontrei esse serviço na agenda.', acoes: [] }; }
    var h = hoje(), partes = [];
    if (etapa === 'corte') {
      j.oficinaFim = h;
      if (j.start > h) { j.start = h; }
      logJob(j, 'andamento', 'em produção', 'corte/fabricação concluído');
      partes.push('✂️ **' + j.cli + '**: corte/fabricação concluído — oficina liberada.');
    } else if (etapa === 'pronto') {
      j.oficinaFim = h; j.stage = 'pronto';
      logJob(j, 'andamento', 'em produção', 'pronto para entrega');
      partes.push('📦 **' + j.cli + '**: pronto para entrega.');
    } else if (etapa === 'previsao' && valor) {
      var nova = valor < h ? h : valor;
      if (nova <= j.start) nova = add(j.start, 1);
      logJob(j, 'prazo', j.end, nova);
      partes.push('📅 **' + j.cli + '**: nova previsão de entrega **' + fdb(nova) + '** (era ' + fdb(j.end) + ').');
      j.end = nova;
    } else if (etapa === 'atraso' && valor) {
      var base = maxd(j.end, h), nv = add(base, +valor);
      logJob(j, 'prazo', j.end, nv);
      partes.push('🔴 **' + j.cli + '**: atrasou ' + valor + ' dia(s) — nova entrega **' + fdb(nv) + '**.');
      j.end = nv;
    } else if (etapa === 'clientelivre' || (etapa === 'clienteate' && valor && valor <= h)) {
      logJob(j, 'cliente', j.clienteAte || 'aguardando', 'liberou a obra');
      j.clienteAte = '';
      partes.push('✅ **' + j.cli + '**: obra liberada pelo cliente.');
    } else if (etapa === 'clienteate' && valor) {
      logJob(j, 'cliente', j.clienteAte || '—', valor);
      j.clienteAte = valor;
      partes.push('⏸️ **' + j.cli + '**: obra do cliente só libera **' + fdb(valor) + '** — a oficina segue com o próximo.');
    } else if (etapa === 'matok' || (etapa === 'material' && valor && valor <= h)) {
      logJob(j, 'material', j.matChega || 'sem previsão', 'chegou');
      j.matOk = true; if (!j.matChega || j.matChega > h) j.matChega = h;
      partes.push('🪨 **' + j.cli + '**: pedra chegou.');
    } else if (etapa === 'material' && valor) {
      logJob(j, 'material', j.matChega || 'sem previsão', valor);
      j.matOk = false; j.matChega = valor;
      partes.push('🪨 **' + j.cli + '**: pedra prevista para **' + fdb(valor) + '**.');
    } else if (etapa === 'matatraso' && valor) {
      var bm = (j.matChega && j.matChega > h) ? j.matChega : h, nm = add(bm, +valor);
      logJob(j, 'material', j.matChega || 'sem previsão', nm);
      j.matOk = false; j.matChega = nm;
      partes.push('🪨 **' + j.cli + '**: pedra atrasou ' + valor + ' dia(s) — chega **' + fdb(nm) + '**.');
    } else {
      return { ok: false, texto: '⚠️ Não entendi o que aconteceu com ' + j.cli + '.', acoes: [] };
    }
    if (opcoes && opcoes.fim && (etapa === 'corte' || etapa === 'pronto' || etapa === 'atraso')) {           // "terminamos o corte e entrega dia X"
      var n2 = opcoes.fim < h ? h : opcoes.fim;
      if (n2 !== j.end) { logJob(j, 'prazo', j.end, n2); partes.push('📅 Entrega ajustada para **' + fdb(n2) + '**.'); j.end = n2; }
    }
    var mud = planoFila();
    aplicarPlano(mud);
    if (!mud.length) salvar();
    var d = descreverMudancas(mud);
    var acoes = d.acoes.slice();
    if (mud.length) acoes.push({ label: '↩️ Desfazer', fn: 'hrDesfazerPlano()' });
    var proximo = mud.filter(function (m) { return m.tipo === 'adiantar' && m.para.s === h; })[0];
    var texto = partes.join('\n');
    if (mud.length) texto += '\n\n🧠 Reorganizei a fila:\n' + d.texto;
    else texto += '\n\n🧠 A fila continua como estava — ninguém precisa mudar de data.';
    if (proximo) texto += '\n\n👉 Próximo: comece **' + proximo.job.cli + '** hoje' + (proximo.job.desc ? ' (' + proximo.job.desc + ')' : '') + '.';
    return { ok: true, texto: texto, acoes: acoes };
  };

  // Atalhos dos botões do "Como estamos?"
  window.hrBotao = function (jobId, etapa) {
    var r = window.hrAndamento(jobId, etapa);
    responderChat(r.texto, r.acoes);
  };

  // Resposta no chat da secretária (se o chat não estiver carregado, vira aviso na tela)
  function garantirHistorico() {
    try { if (typeof _chat !== 'undefined' && Array.isArray(_chat.history) && !_chat.history.length && typeof _chatLoad === 'function') _chatLoad(); } catch (e) {}
  }
  function responderChat(texto, acoes) {
    try {
      garantirHistorico();
      if (!document.getElementById('chatBody')) toast(String(texto).replace(/\*\*/g, '').split('\n')[0]);   // fora do chat: feedback imediato
      if (typeof _chatBotReply === 'function' && typeof _chat !== 'undefined') {
        _chatBotReply(texto, acoes && acoes.length ? acoes : null); return;
      }
    } catch (e) {}
    toast(String(texto).replace(/\*\*/g, '').split('\n')[0]);
  }

  // ── Modal de data (nova previsão) ──────────────────────────────
  window.hrPerguntaData = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    var ant = document.getElementById('hrAutoDataMd'); if (ant) ant.remove();
    var m = document.createElement('div');
    m.id = 'hrAutoDataMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">📅 Quando termina?</div>' +
      '<div style="font-size:.85rem;color:var(--t3,#999);margin-bottom:12px;">' + esc(j.cli) + ' — entrega hoje prevista para ' + fdb(j.end) + '</div>' +
      '<input id="hrAutoDataIn" type="date" value="' + esc(j.end) + '" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd2,#444);background:var(--s2,#1d1910);color:var(--tx,#eee);font-size:1rem;box-sizing:border-box;">' +
      '<button id="hrAutoDataOk" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.95rem;cursor:pointer;">Salvar e reorganizar a fila</button>' +
      '<button id="hrAutoDataNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Cancelar</button></div>';
    document.body.appendChild(m);
    document.getElementById('hrAutoDataNo').onclick = function () { m.remove(); };
    document.getElementById('hrAutoDataOk').onclick = function () {
      var v = document.getElementById('hrAutoDataIn').value;
      m.remove(); if (!v) return;
      var r = window.hrAndamento(jobId, 'previsao', v);
      responderChat(r.texto, r.acoes);
    };
  };

  // ── Modal: obra do cliente ainda não está pronta ───────────────
  window.hrPerguntaCliente = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    var ant = document.getElementById('hrAutoCliMd'); if (ant) ant.remove();
    var h = hoje(), sug = (j.clienteAte && j.clienteAte > h) ? j.clienteAte : add(h, 7);
    var m = document.createElement('div');
    m.id = 'hrAutoCliMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">⏸️ Até quando o cliente não está pronto?</div>' +
      '<div style="font-size:.85rem;color:var(--t3,#999);margin-bottom:12px;">' + esc(j.cli) + ' — a obra precisa estar liberada para medir e começar. Enquanto isso a oficina segue com o próximo da fila.</div>' +
      '<input id="hrAutoCliIn" type="date" value="' + esc(sug) + '" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd2,#444);background:var(--s2,#1d1910);color:var(--tx,#eee);font-size:1rem;box-sizing:border-box;">' +
      '<button id="hrAutoCliOk" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.95rem;cursor:pointer;">Salvar e reorganizar a fila</button>' +
      '<button id="hrAutoCliJa" style="width:100%;margin-top:8px;padding:12px;border:1px solid var(--gold,#C9A84C);border-radius:12px;background:transparent;color:var(--gold,#C9A84C);font-weight:700;cursor:pointer;">✅ A obra já está liberada</button>' +
      '<button id="hrAutoCliNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Cancelar</button></div>';
    document.body.appendChild(m);
    document.getElementById('hrAutoCliNo').onclick = function () { m.remove(); };
    document.getElementById('hrAutoCliJa').onclick = function () { m.remove(); var r = window.hrAndamento(jobId, 'clientelivre'); responderChat(r.texto, r.acoes); };
    document.getElementById('hrAutoCliOk').onclick = function () {
      var v = document.getElementById('hrAutoCliIn').value; m.remove(); if (!v) return;
      var r = window.hrAndamento(jobId, 'clienteate', v); responderChat(r.texto, r.acoes);
    };
  };

  // ── Modal: data da pedra ───────────────────────────────────────
  window.hrPerguntaMaterial = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    var ant = document.getElementById('hrAutoMatMd'); if (ant) ant.remove();
    var h = hoje(), sug = (j.matChega && j.matChega > h) ? j.matChega : add(h, 3);
    var m = document.createElement('div');
    m.id = 'hrAutoMatMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">🪨 Quando chega a pedra?</div>' +
      '<div style="font-size:.85rem;color:var(--t3,#999);margin-bottom:12px;">' + esc(j.cli) + (j.mat || j.material ? ' — ' + esc(j.mat || j.material) : '') + '</div>' +
      '<input id="hrAutoMatIn" type="date" value="' + esc(sug) + '" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd2,#444);background:var(--s2,#1d1910);color:var(--tx,#eee);font-size:1rem;box-sizing:border-box;">' +
      '<button id="hrAutoMatOk" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.95rem;cursor:pointer;">Salvar e reorganizar a fila</button>' +
      '<button id="hrAutoMatJa" style="width:100%;margin-top:8px;padding:12px;border:1px solid var(--gold,#C9A84C);border-radius:12px;background:transparent;color:var(--gold,#C9A84C);font-weight:700;cursor:pointer;">✅ A pedra já chegou</button>' +
      '<button id="hrAutoMatNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Cancelar</button></div>';
    document.body.appendChild(m);
    document.getElementById('hrAutoMatNo').onclick = function () { m.remove(); };
    document.getElementById('hrAutoMatJa').onclick = function () { m.remove(); var r = window.hrAndamento(jobId, 'matok'); responderChat(r.texto, r.acoes); };
    document.getElementById('hrAutoMatOk').onclick = function () {
      var v = document.getElementById('hrAutoMatIn').value; m.remove(); if (!v) return;
      var r = window.hrAndamento(jobId, 'material', v); responderChat(r.texto, r.acoes);
    };
  };

  // ── Modal: ajustes da fila (sábado / dias de instalação) ───────
  window.hrConfigFila = function () {
    var c = cfgFila(), ant = document.getElementById('hrAutoCfgMd'); if (ant) ant.remove();
    var m = document.createElement('div');
    m.id = 'hrAutoCfgMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    var chips = c.extras.slice().sort().map(function (d) {
      return '<span style="display:inline-flex;gap:6px;align-items:center;background:var(--s2,#1d1910);border:1px solid var(--bd2,#444);border-radius:999px;padding:5px 10px;margin:3px 4px 0 0;font-size:.82rem;">' + fdb(d) + '/' + d.slice(0, 4) +
        ' <b data-d="' + d + '" style="cursor:pointer;color:var(--gold,#C9A84C);">✕</b></span>';
    }).join('');
    var inp = 'width:100%;padding:12px;border-radius:10px;border:1px solid var(--bd2,#444);background:var(--s2,#1d1910);color:var(--tx,#eee);font-size:1rem;box-sizing:border-box;';
    m.innerHTML = '<div style="width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.05rem;font-weight:800;margin-bottom:12px;">⚙️ Ajustes da fila</div>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:12px;font-size:.92rem;"><input id="hrCfgSab" type="checkbox" ' + (c.sabado ? 'checked' : '') + ' style="width:20px;height:20px;"> Trabalhamos aos sábados</label>' +
      '<label style="display:flex;gap:10px;align-items:center;margin-bottom:14px;font-size:.92rem;"><input id="hrCfgFac" type="checkbox" ' + (c.facultativos ? 'checked' : '') + ' style="width:20px;height:20px;"> Folga no Carnaval e no Corpus Christi</label>' +
      '<div style="font-size:.85rem;color:var(--t3,#999);margin-bottom:6px;">Dias de instalação no final do serviço (a oficina já fica livre para o próximo)</div>' +
      '<input id="hrCfgInst" type="number" min="0" max="10" value="' + c.instDias + '" style="' + inp + '">' +
      '<div style="font-size:.85rem;color:var(--t3,#999);margin:14px 0 6px;">Feriados nacionais e a Sexta-feira Santa já são pulados sozinhos. Outros dias sem trabalho (feriado da cidade, recesso):</div>' +
      '<div style="display:flex;gap:8px;"><input id="hrCfgDia" type="date" style="' + inp + 'flex:1;"><button id="hrCfgAdd" style="padding:0 16px;border:none;border-radius:10px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;cursor:pointer;">+</button></div>' +
      '<div style="margin-top:6px;">' + (chips || '<span style="font-size:.8rem;color:var(--t3,#999);">Nenhum dia extra.</span>') + '</div>' +
      '<button id="hrCfgOk" style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.95rem;cursor:pointer;">Salvar</button>' +
      '<button id="hrCfgNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Cancelar</button></div>';
    document.body.appendChild(m);
    function lerForm(extras) {
      var d = parseInt(document.getElementById('hrCfgInst').value, 10);
      return { sabado: document.getElementById('hrCfgSab').checked, facultativos: document.getElementById('hrCfgFac').checked, instDias: isNaN(d) ? 1 : Math.max(0, Math.min(10, d)), extras: extras };
    }
    document.getElementById('hrCfgNo').onclick = function () { m.remove(); };
    document.getElementById('hrCfgAdd').onclick = function () {
      var v = document.getElementById('hrCfgDia').value; if (!v) return;
      var ex = c.extras.slice(); if (ex.indexOf(v) < 0) ex.push(v);
      salvarCfgFila(lerForm(ex)); window.hrConfigFila();
    };
    Array.prototype.forEach.call(m.querySelectorAll('[data-d]'), function (el) {
      el.onclick = function () { salvarCfgFila(lerForm(c.extras.filter(function (x) { return x !== el.getAttribute('data-d'); }))); window.hrConfigFila(); };
    });
    document.getElementById('hrCfgOk').onclick = function () {
      salvarCfgFila(lerForm(c.extras.slice())); m.remove(); toast('⚙️ Fila ajustada'); try { renderAg(); } catch (e) {}
    };
  };

  window.hrAbrirPlano = function () {
    var mud = planoFila();
    if (!mud.length) { toast('🧠 A fila está certinha — nada a mudar'); return; }
    var ant = document.getElementById('hrAutoPlanoMd'); if (ant) ant.remove();
    var m = document.createElement('div');
    m.id = 'hrAutoPlanoMd';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    var rows = mud.map(function (x, i) {
      var cor = x.tipo === 'adiantar' ? '#5dbf7a' : '#e0a530';
      return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--bd2,#333);">' +
        '<input type="checkbox" data-i="' + i + '" checked style="margin-top:4px;width:18px;height:18px;">' +
        '<div style="font-size:.88rem;line-height:1.45;"><b>' + esc(x.job.cli) + '</b> <span style="color:' + cor + ';font-weight:800;">' + (x.tipo === 'adiantar' ? '⏩ adiantar' : '⏳ empurrar') + '</span><br>' +
        'início ' + fdb(x.de.s) + ' → <b>' + fdb(x.para.s) + '</b> · entrega ' + fdb(x.de.e) + ' → <b>' + fdb(x.para.e) + '</b>' + (x.motivo === 'material' ? '<br>🪨 aguardando a pedra' : x.motivo === 'cliente' ? '<br>⏸️ aguardando o cliente liberar a obra' : '') + '</div></label>';
    }).join('');
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:20px 20px 24px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;max-height:88vh;overflow:auto;">' +
      '<div style="font-size:1.05rem;font-weight:800;margin-bottom:4px;">🧠 Sugestão da agenda</div>' +
      '<div style="font-size:.8rem;color:var(--t3,#999);margin-bottom:6px;">Desmarque quem deve <b>manter a data</b> (fica travado e a agenda não mexe mais).</div>' +
      rows +
      '<button id="hrAutoPlanoOk" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:var(--gold3,#C9A84C);color:#000;font-weight:800;font-size:.95rem;cursor:pointer;">✅ Aplicar</button>' +
      '<button id="hrAutoPlanoNo" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);cursor:pointer;">Agora não</button></div>';
    document.body.appendChild(m);
    document.getElementById('hrAutoPlanoNo').onclick = function () { m.remove(); };
    document.getElementById('hrAutoPlanoOk').onclick = function () {
      var marcar = [], travar = [];
      m.querySelectorAll('input[type=checkbox]').forEach(function (c) {
        var x = mud[+c.getAttribute('data-i')];
        if (c.checked) marcar.push(x); else travar.push(x);
      });
      m.remove();
      travar.forEach(function (x) { x.job.fixo = true; });
      var plano = travar.length ? planoFila() : marcar;   // recalcula com os travados
      aplicarPlano(plano);
      var d = descreverMudancas(plano);
      if (plano.length) responderChat('🧠 Fila reorganizada:\n' + d.texto, d.acoes.concat([{ label: '↩️ Desfazer', fn: 'hrDesfazerPlano()' }]));
      else salvar();
      toast('✅ Agenda atualizada');
    };
  };

  // ═════════════════════════════════════════════════════════════
  //  INTERPRETAÇÃO DE TEXTO DA SECRETÁRIA (funciona sem IA)
  // ═════════════════════════════════════════════════════════════
  var STOP = { de: 1, da: 1, do: 1, dos: 1, das: 1, e: 1, dona: 1, dom: 1, seu: 1, sr: 1, sra: 1, senhor: 1, senhora: 1 };
  function achaJobPorTexto(s) {
    var melhor = null, score = 0, empate = false;
    jobsAtivos().forEach(function (j) {
      var toks = norm(j.cli).split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 3 && !STOP[t]; });
      var sc = 0;
      toks.forEach(function (t) { if (new RegExp('(^|[^a-z0-9])' + t + '([^a-z0-9]|$)').test(s)) sc++; });
      if (sc > score) { score = sc; melhor = j; empate = false; } else if (sc === score && sc > 0) { empate = true; }
    });
    return (score > 0 && !empate) ? melhor : null;
  }
  var DIAS_SEM = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  function isoDe(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  }
  function parseData(t) {
    var s = norm(t), h = hoje(), m;
    var hp = h.split('-'), hy = +hp[0], hm = +hp[1], hd = +hp[2];
    if (/depois de amanha/.test(s)) return add(h, 2);
    if (/amanha/.test(s)) return add(h, 1);
    if (m = s.match(/(?:em|daqui a|dentro de)\s+(\d{1,2})\s+dias?/)) return add(h, +m[1]);
    if (m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/)) {
      var y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : hy;
      var iso = isoDe(y, +m[2], +m[1]);
      if (iso && !m[3] && iso < h) iso = isoDe(y + 1, +m[2], +m[1]);
      return iso;
    }
    if (m = s.match(/\bdia\s+(\d{1,2})\b/)) {
      var d = +m[1], iso2 = isoDe(hy, hm, d);
      if (!iso2 || iso2 < h) { var nm = hm === 12 ? 1 : hm + 1, ny = hm === 12 ? hy + 1 : hy; iso2 = isoDe(ny, nm, d); }
      return iso2;
    }
    for (var nome in DIAS_SEM) {
      if (new RegExp('\\b' + nome + '\\b').test(s)) {
        var hoje0 = new Date(Date.UTC(hy, hm - 1, hd)).getUTCDay();
        var falta = (DIAS_SEM[nome] - hoje0 + 7) % 7; if (falta === 0) falta = 7;
        return add(h, falta);
      }
    }
    if (/\bhoje\b/.test(s)) return h;
    return null;
  }
  window.hrParseData = parseData;

  // Retorna true se tratou a mensagem sozinho
  window.hrChatInterpretar = function (texto) {
    try {
      var s = norm(texto);
      if (!s || s.length < 8) return false;
      var hk = window.hrChatExtras || [];
      for (var hi = 0; hi < hk.length; hi++) { try { if (hk[hi](texto, s) === true) return true; } catch (e) {} }
      var j = achaJobPorTexto(s);
      if (!j) return false;
      var data = parseData(texto), etapa = null, valor = null, fim = null;
      var falouMat = /\b(pedra|pedras|material|chapa|chapas|granito|marmore|quartzo|quartzito)\b/.test(s);
      var mAtM = s.match(/atras\w*\s*(?:de\s*)?(\d{1,2})\s*dias?/);
      if (falouMat) {
        var rm = null;
        if (/(nao chegou|nao chegaram|ainda nao|ainda falta|nao veio|nao vem)/.test(s)) { if (data) rm = ['material', data]; }
        else if (/(chegou|chegaram|recebemos|recebi|entregaram|ja chegou)/.test(s)) rm = ['matok', null];
        else if (/atras/.test(s) && mAtM) rm = ['matatraso', +mAtM[1]];
        else if (data && /(chega|chegam|chegara|vai chegar|previs|vem )/.test(s)) rm = ['material', data];
        if (rm) { var rr = window.hrAndamento(j.id, rm[0], rm[1]); responderChat(rr.texto, rr.acoes); return true; }
      }
      var rc = null;
      if (/(nao esta pront|nao ficou pront|ainda nao liberou|nao liberou|so libera|so fica pront|pediu (pra|para) (esperar|segurar|adiar|aguardar)|obra atrasou|reforma atrasou|obra nao terminou|obra ainda nao)/.test(s) && data) rc = ['clienteate', data];
      else if (/(liberou a obra|obra liberada|obra (ja )?(esta|ficou) pront|cliente liberou|local liberado|ja pode (ir|medir|comecar))/.test(s)) rc = ['clientelivre', null];
      if (rc) { var rcr = window.hrAndamento(j.id, rc[0], rc[1]); responderChat(rcr.texto, rcr.acoes); return true; }
      var falouFim = /(termin|conclu|finaliz|acab|fechamos|ficou pront|fica pront)/.test(s);
      var falouOficina = /(cort|serr|pedra|fabrica|bancada|producao|oficina|acabamento|polimento|marmore|granito)/.test(s);
      if (falouFim && falouOficina) etapa = 'corte';
      if (/pront[oa]s?\s+(p\/?|para|pra)\s*(a\s*)?(entreg|instal)|tudo pront|totalmente pront/.test(s)) etapa = 'pronto';
      var mAt = s.match(/atras\w*\s*(?:de\s*)?(\d{1,2})\s*dias?/);
      if (!etapa && mAt) { etapa = 'atraso'; valor = +mAt[1]; }
      if (!etapa && data && /(termin|conclu|entreg|fica pront|acaba|finaliz|previs|estim|prazo|vamos)/.test(s)) { etapa = 'previsao'; valor = data; }
      if (!etapa) return false;
      if ((etapa === 'corte' || etapa === 'pronto') && data && /(entreg|previs|fica pront|instal)/.test(s)) fim = data;
      var r = window.hrAndamento(j.id, etapa, valor, { fim: fim });
      responderChat(r.texto, r.acoes);
      return true;
    } catch (e) { console.error('hrChatInterpretar:', e); return false; }
  };

  // Ação vinda da IA: {"action":"andamento","cli":"","etapa":"corte|pronto|previsao|atraso|material|matok|matatraso","termina":"YYYY-MM-DD","dias":2}
  window.hrAndamentoPorCli = function (data) {
    var s = norm(data.cli || '');
    var j = achaJobPorTexto(s) || jobsAtivos().find(function (x) { return norm(x.cli).indexOf(s) !== -1; });
    if (!j) return { texto: '⚠️ Serviço de **' + (data.cli || '?') + '** não encontrado na agenda.', acoes: [] };
    var etapa = data.etapa || (data.termina ? 'previsao' : 'corte');
    var valor = (etapa === 'atraso' || etapa === 'matatraso') ? +data.dias : data.termina;
    return window.hrAndamento(j.id, etapa, valor, { fim: (etapa === 'corte' || etapa === 'pronto' || etapa === 'atraso') ? data.termina : null });
  };

  // ═════════════════════════════════════════════════════════════
  //  "COMO ESTAMOS?" DIÁRIO DA SECRETÁRIA
  // ═════════════════════════════════════════════════════════════
  window.hrCheckinDiario = function (forcar) {
    try {
      if (typeof _chatBotReply !== 'function' || typeof _chat === 'undefined') return false;
      garantirHistorico();   // _chatBotReply grava tudo: sem carregar antes, apagaria as conversas antigas
      if (!Array.isArray(_chat.history)) return false;
      var h = hoje(), agora = new Date();
      if (!forcar) {
        if (agora.getHours() < 6) return false;
        if (localStorage.getItem('hr_checkin_dia') === h) return false;
      }
      var ativos = jobsAtivos();
      if (!ativos.length) return false;
      var prod = ativos.filter(function (j) { return jaComecou(j, h) && etapaDe(j) === 'producao'; })
        .sort(function (a, b) { return a.end < b.end ? -1 : 1; });
      var fila = ativos.filter(function (j) { return !jaComecou(j, h); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      var saud = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
      var t = '☀️ ' + saud + '! **Como estamos hoje?**\n';
      if (prod.length) {
        t += '\n🛠️ **Em produção agora:**\n' + prod.slice(0, 6).map(function (j) {
          var atr = j.end < h ? ' 🔴 atrasado ' + diff(j.end, h) + 'd' : '';
          return '• **' + j.cli + '** — ' + (j.desc || '') + ' · entrega ' + fdb(j.end) + atr;
        }).join('\n');
      }
      if (fila.length) {
        t += '\n\n⏭️ **Próximos da fila:**\n' + fila.slice(0, 3).map(function (j) {
          return '• **' + j.cli + '** — início ' + fdb(j.start) + ' · entrega ' + fdb(j.end);
        }).join('\n');
      }
      var comecaHoje = ativos.filter(function (j) { return j.start === h && !j.medido; });
      comecaHoje.forEach(function (j) {
        t += '\n\n🛠️ **Hoje é o dia de iniciar a obra de ' + j.cli + '** — projeto ' + (j.proj || '') + '. Lembre-se de ir na casa do cliente conferir as medidas.';
      });
      var pedras = ativos.filter(function (j) {
        return etapaDe(j) === 'producao' && (j.mat || j.material) && !j.matOk && !j.oficinaFim && j.start <= add(h, 10);
      }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      if (pedras.length) {
        t += '\n\n🪨 **Pedra dos próximos serviços:**\n' + pedras.slice(0, 4).map(function (j) {
          var st = !j.matChega ? 'sem previsão — já chegou?' : j.matChega > h ? 'chega ' + fdb(j.matChega) : '🔴 devia ter chegado em ' + fdb(j.matChega) + ' — já chegou?';
          return '• **' + j.cli + '** — ' + st;
        }).join('\n');
      }
      var porDia = {};
      ativos.filter(function (j) { return j.instala && etapaDe(j) !== 'instalado' && j.end >= h && j.end <= add(h, 14); })
        .forEach(function (j) { (porDia[j.end] = porDia[j.end] || []).push(j); });
      Object.keys(porDia).sort().forEach(function (d) {
        if (porDia[d].length > 1) t += '\n\n🔧 **Instalações no mesmo dia (' + fdb(d) + '):** ' + porDia[d].map(function (j) { return j.cli; }).join(' e ') + ' — confira a equipe.';
      });
      var extraAcoes = [];
      (window.hrCheckinExtras || []).forEach(function (fn) {
        try { var r = fn(h, ativos); if (r && r.texto) { t += '\n\n' + r.texto; (r.acoes || []).forEach(function (a) { extraAcoes.push(a); }); } } catch (e) { console.warn('checkin extra:', e); }
      });
      t += '\n\nMe conta o que andou. Ex.: *“terminamos de cortar a cozinha da Maria”* *“Maria termina dia 15”* ou *“a pedra da Maria chega dia 10”*. Eu reorganizo a fila para ninguém atrasar.';
      var acoes = [];
      prod.slice(0, 3).forEach(function (j) {
        var id = JSON.stringify(String(j.id)), n = primeiroNome(j.cli);
        acoes.push({ label: '✂️ ' + n + ': corte pronto', fn: 'hrBotao(' + id + ",'corte')" });
        acoes.push({ label: '📅 ' + n + ': nova data', fn: 'hrPerguntaData(' + id + ')' });
      });
      pedras.slice(0, 2).forEach(function (j) {
        var id = JSON.stringify(String(j.id)), n = primeiroNome(j.cli);
        acoes.push({ label: '🪨 ' + n + ': pedra chegou', fn: 'hrBotao(' + id + ",'matok')" });
        acoes.push({ label: '📅 ' + n + ': pedra chega dia…', fn: 'hrPerguntaMaterial(' + id + ')' });
      });
      comecaHoje.slice(0, 2).forEach(function (j) {
        acoes.push({ label: '📐 Medidas conferidas: ' + primeiroNome(j.cli), fn: 'hrMedicaoFeita(' + JSON.stringify(String(j.id)) + ')' });
      });
      extraAcoes.slice(0, 4).forEach(function (a) { acoes.push(a); });
      _chatBotReply(t, acoes);
      localStorage.setItem('hr_checkin_dia', h);   // só marca o dia depois de postar
      try { if (typeof secNotifDotUpdate === 'function') secNotifDotUpdate(); } catch (e) {}
      return true;
    } catch (e) { console.error('hrCheckinDiario:', e); return false; }
  };

  // ═════════════════════════════════════════════════════════════
  //  CONTRATO COM AS DATAS DA AGENDA (2)
  // ═════════════════════════════════════════════════════════════
  window.hrContratoPrefill = function (q) {
    try {
      var j = (DB.j || []).find(function (x) { return String(x.qId) === String(q.id); });
      var ini = j ? j.start : q.prazoInicio, fim = j ? j.end : q.prazoEntrega;
      if (!ini || !fim) return;
      var i1 = document.getElementById('contrDataInicio'), i2 = document.getElementById('contrDataEntrega'), i3 = document.getElementById('contrPrazo');
      if (i1) i1.value = ini;
      if (i2) i2.value = fim;
      if (i3 && diff(ini, fim) > 0) i3.value = diff(ini, fim);
      var info = document.getElementById('contrAgendaInfo');
      if (info) { info.style.display = 'block'; info.textContent = '📅 Datas da Agenda: início ' + fd(ini) + ' · entrega ' + fd(fim); }
    } catch (e) { console.warn('hrContratoPrefill:', e); }
  };
  // Datas alteradas no contrato voltam para a agenda
  window.hrContratoSincronizar = function (q, ini, fim) {
    try {
      var j = (DB.j || []).find(function (x) { return String(x.qId) === String(q.id) && !x.done; });
      if (!j || !ini || !fim) return;
      if (j.start !== ini || j.end !== fim) {
        logJob(j, 'prazo', fdb(j.start) + '→' + fdb(j.end), fdb(ini) + '→' + fdb(fim));
        j.start = ini; j.end = fim; j.fixo = true;
        salvar();
        toast('📅 Agenda atualizada com as datas do contrato');
      }
    } catch (e) { console.warn('hrContratoSincronizar:', e); }
  };

  // Liga o contrato à agenda: ao abrir, puxa início/entrega do serviço agendado;
  // ao confirmar, datas editadas voltam para a agenda.
  function diasUteis(ini, fim) {
    var n = 0, t = pd(ini), f = pd(fim);
    while (t < f) { t += 86400000; var w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  function envolverContrato() {
    if (typeof window.gerarContrato === 'function' && !window.gerarContrato.__hrAuto) {
      var og = window.gerarContrato;
      window.gerarContrato = function (id, e) {
        var r = og.apply(this, arguments);
        try {
          var q = achaQ(id); if (!q) return r;
          var j = (DB.j || []).find(function (x) { return String(x.qId) === String(q.id) && !x.done; });
          var ini = j ? j.start : q.prazoInicio, fim = j ? j.end : q.prazoEntrega;
          window._hrContrAg = null;
          if (ini && fim) {
            window.hrContratoPrefill(q);
            var du = diasUteis(ini, fim);
            var pz = document.getElementById('contrPrazo'); if (pz && du > 0) pz.value = du;
            window._hrContrAg = { ini: ini, fim: fim, prazo: String(du) };
            var en = document.getElementById('contrDataEntrega'); if (en) en.value = fim;
          }
        } catch (err) { console.warn('hr-auto gerarContrato:', err); }
        return r;
      };
      window.gerarContrato.__hrAuto = true;
    }
    // O cálculo automático (início + prazo) não pode sobrescrever a entrega da agenda
    if (typeof window.contrCalcEntrega === 'function' && !window.contrCalcEntrega.__hrAuto) {
      var oc = window.contrCalcEntrega;
      window.contrCalcEntrega = function () {
        var r = oc.apply(this, arguments);
        try {
          var a = window._hrContrAg;
          var ini = document.getElementById('contrDataInicio'), pz = document.getElementById('contrPrazo'), en = document.getElementById('contrDataEntrega');
          if (a && ini && pz && en) {
            if (ini.value === a.ini && String(pz.value) === a.prazo) en.value = a.fim;   // nada mudou: mantém a data da agenda
            else window._hrContrAg = null;                                               // o dono mexeu: vale o que ele digitou
          }
        } catch (err) {}
        return r;
      };
      window.contrCalcEntrega.__hrAuto = true;
    }
    if (typeof window.confirmarContrato === 'function' && !window.confirmarContrato.__hrAuto) {
      var oconf = window.confirmarContrato;
      window.confirmarContrato = function () {
        try {
          var q = achaQ(window._contrId);
          var ini = (document.getElementById('contrDataInicio') || {}).value, fim = (document.getElementById('contrDataEntrega') || {}).value;
          if (q && ini && fim) window.hrContratoSincronizar(q, ini, fim);
        } catch (err) { console.warn('hr-auto confirmarContrato:', err); }
        return oconf.apply(this, arguments);
      };
      window.confirmarContrato.__hrAuto = true;
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  GARANTIA DE 1 ANO (complementa o pós-venda de 30 dias)
  //  Avisa 30 dias antes de a garantia terminar; o app só prepara a mensagem.
  // ═════════════════════════════════════════════════════════════
  var GARANTIA_DIAS = 365, GARANTIA_AVISO = 30;
  function garantiaPendentes() {
    var h = hoje();
    return (DB.j || []).filter(function (j) {
      if (!j || !j.done || j.garantiaFeita || j.garantiaDispensada) return false;
      var ref = j.doneAt || j.end; if (!ref) return false;
      var fim = add(ref, GARANTIA_DIAS), falta = diff(h, fim);
      return falta <= GARANTIA_AVISO && falta >= 0;   // de 30 dias antes até o dia em que termina
    }).sort(function (a, b) { return String(a.doneAt || a.end).localeCompare(String(b.doneAt || b.end)); });
  }
  window.hrGarantiaPendentes = garantiaPendentes;
  function textoGarantia(j) {
    var ref = j.doneAt || j.end, fim = add(ref, GARANTIA_DIAS), nome = primeiroNome(j.cli);
    return 'Oi' + (nome ? ', ' + nome : '') + '! A garantia de 1 ano do seu serviço' + (j.desc ? ' (' + String(j.desc).split(' — ')[0] + ')' : '') +
      ' termina em ' + fdb(fim) + '. Se tiver notado qualquer detalhe, é só nos chamar que a gente confere. — HR Mármores e Granitos';
  }
  window.hrGarantiaAvisar = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    var q = j.qId ? achaQ(j.qId) : null, tel = j.tel || (q && q.tel) || '', txt = textoGarantia(j);
    if (typeof _dashAbrirZap === 'function') _dashAbrirZap(tel, txt);
    else { var num = String(tel).replace(/\D/g, ''); if (num && num.length <= 11) num = '55' + num; window.open((num ? 'https://wa.me/' + num : 'https://wa.me/') + '?text=' + encodeURIComponent(txt), '_blank'); }
    j.garantiaFeita = hoje(); salvar(); toast('🛡️ Aviso de garantia de ' + primeiroNome(j.cli) + ' marcado como feito');
  };
  window.hrGarantiaDispensar = function (jobId) {
    var j = achaJobPorId(jobId); if (!j) return;
    j.garantiaDispensada = hoje(); salvar(); toast('Ok — não aviso mais sobre a garantia de ' + primeiroNome(j.cli));
  };

  // ═════════════════════════════════════════════════════════════
  //  AVISOS NO TOPO DA AGENDA
  // ═════════════════════════════════════════════════════════════
  function css() {
    if (document.getElementById('hrAutoCss')) return;
    var s = document.createElement('style'); s.id = 'hrAutoCss';
    s.textContent =
      '.hra-card{margin:0 0 10px;padding:12px 14px;border-radius:14px;border:1px solid var(--bd2,#3a3220);background:var(--s1,#14110a);color:var(--tx,#eee);font-size:.84rem;line-height:1.45}' +
      '.hra-card b{color:var(--gold,#C9A84C)}' +
      '.hra-card.ok{border-color:rgba(93,191,122,.5)}.hra-card.warn{border-color:rgba(224,165,48,.55)}.hra-card.hoje{border-color:rgba(201,168,76,.8);background:rgba(201,168,76,.08)}' +
      '.hra-t{font-weight:800;font-size:.9rem;margin-bottom:4px}' +
      '.hra-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}' +
      '.hra-btn{padding:8px 12px;border-radius:10px;border:1px solid var(--gold,#C9A84C);background:transparent;color:var(--gold,#C9A84C);font-weight:700;font-size:.78rem;cursor:pointer;font-family:inherit}' +
      '.hra-btn.pri{background:var(--gold3,#C9A84C);color:#000;border-color:transparent}' +
      '.hra-btn.mut{border-color:var(--bd2,#444);color:var(--t3,#999)}';
    document.head.appendChild(s);
  }
  function blocoAgenda() {
    var h = hoje(), html = '';
    // dia de iniciar a obra
    jobsAtivos().filter(function (j) {
      return !j.medido && etapaDe(j) === 'producao' && j.start <= h && j.start >= add(h, -3);
    }).forEach(function (j) {
      var q = j.qId ? achaQ(j.qId) : null, id = JSON.stringify(String(j.id));
      var end = q ? [q.end, q.cidade].filter(Boolean).join(' — ') : '';
      html += '<div class="hra-card hoje"><div class="hra-t">🛠️ ' + (j.start === h ? 'Hoje é o dia de iniciar a obra de ' : 'Devia ter iniciado: ') + esc(j.cli) + '</div>' +
        'Projeto <b>' + esc(j.proj || (q ? projNum(q) : '—')) + '</b> · ' + esc(j.desc || '') + '<br>' +
        '📐 Lembre-se de ir na casa do cliente <b>conferir as medidas</b>.' + (end ? '<br>📍 ' + esc(end) : '') +
        '<div class="hra-btns"><button class="hra-btn pri" onclick="hrMedicaoFeita(' + esc(id) + ')">📐 Já conferi as medidas</button>' +
        '<button class="hra-btn" onclick="hrPerguntaData(' + esc(id) + ')">📅 Mudar data</button>' +
        '<button class="hra-btn" onclick="hrPerguntaCliente(' + esc(id) + ')">⏸️ Cliente não está pronto</button></div></div>';
    });
    // garantia de 1 ano terminando
    var gar = garantiaPendentes();
    if (gar.length) {
      html += '<div class="hra-card"><div class="hra-t">🛡️ Garantia terminando (' + gar.length + ')</div>' +
        gar.slice(0, 4).map(function (j) {
          var id = JSON.stringify(String(j.id)), fim = add(j.doneAt || j.end, GARANTIA_DIAS);
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--bd2,#2a2418);">' +
            '<span><b>' + esc(j.cli) + '</b> · termina ' + fdb(fim) + '</span>' +
            '<span><button class="hra-btn pri" onclick="hrGarantiaAvisar(' + esc(id) + ')">💬 Avisar</button> ' +
            '<button class="hra-btn mut" onclick="hrGarantiaDispensar(' + esc(id) + ')">Ignorar</button></span></div>';
        }).join('') + '</div>';
    }
    // obra do cliente ainda não liberada
    var aguard = jobsAtivos().filter(function (j) { return j.clienteAte && j.clienteAte > h && etapaDe(j) === 'producao' && !j.oficinaFim; })
      .sort(function (a, b) { return a.clienteAte < b.clienteAte ? -1 : 1; });
    if (aguard.length) {
      html += '<div class="hra-card warn"><div class="hra-t">⏸️ Aguardando o cliente (' + aguard.length + ')</div>' +
        aguard.slice(0, 4).map(function (j) {
          var id = JSON.stringify(String(j.id));
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--bd2,#2a2418);">' +
            '<span><b>' + esc(j.cli) + '</b> · libera ' + fdb(j.clienteAte) + '</span>' +
            '<span><button class="hra-btn pri" onclick="hrBotao(' + esc(id) + ',\'clientelivre\')">Liberou</button> ' +
            '<button class="hra-btn" onclick="hrPerguntaCliente(' + esc(id) + ')">Data</button></span></div>';
        }).join('') + '</div>';
    }
    // pedra pendente
    var pend = jobsAtivos().filter(function (j) { return etapaDe(j) === 'producao' && j.matChega && !j.matOk && !j.oficinaFim; })
      .sort(function (a, b) { return a.matChega < b.matChega ? -1 : 1; });
    if (pend.length) {
      html += '<div class="hra-card warn"><div class="hra-t">🪨 Pedra a caminho (' + pend.length + ')</div>' +
        pend.slice(0, 4).map(function (j) {
          var id = JSON.stringify(String(j.id)), atr = j.matChega < h;
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--bd2,#2a2418);">' +
            '<span><b>' + esc(j.cli) + '</b> · ' + (atr ? '🔴 devia ter chegado ' : 'chega ') + fdb(j.matChega) + '</span>' +
            '<span><button class="hra-btn pri" onclick="hrBotao(' + esc(id) + ',\'matok\')">Chegou</button> ' +
            '<button class="hra-btn" onclick="hrPerguntaMaterial(' + esc(id) + ')">Data</button></span></div>';
        }).join('') + '</div>';
    }
    // aceitos sem agenda
    var sem = aceitosSemAgenda();
    if (sem.length) {
      html += '<div class="hra-card warn"><div class="hra-t">⚠️ ' + sem.length + ' orçamento(s) aceito(s) sem agenda</div>' +
        sem.slice(0, 4).map(function (q) {
          var id = JSON.stringify(String(q.id));
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--bd2,#2a2418);">' +
            '<span><b>' + esc(q.cli) + '</b> · ' + esc(q.tipo || '') + '</span>' +
            '<span><button class="hra-btn pri" onclick="hrAgendarQ(' + esc(id) + ')">Agendar</button> ' +
            '<button class="hra-btn mut" onclick="hrDispensarAgenda(' + esc(id) + ')">Ignorar</button></span></div>';
        }).join('') +
        '<div class="hra-btns"><button class="hra-btn pri" onclick="hrAgendarTodos()">📅 Agendar todos</button></div></div>';
    }
    // sugestões da fila
    var plano = planoFila();
    if (plano.length) {
      var adi = plano.filter(function (m) { return m.tipo === 'adiantar'; }).length, atr = plano.length - adi;
      html += '<div class="hra-card ok"><div class="hra-t">🧠 Agenda inteligente</div>' +
        (adi ? '⏩ Dá para <b>adiantar ' + adi + '</b> serviço(s). ' : '') + (atr ? '⏳ <b>' + atr + '</b> serviço(s) com conflito de data. ' : '') +
        '<div class="hra-btns"><button class="hra-btn pri" onclick="hrAbrirPlano()">Ver sugestões</button></div></div>';
    }
    (window.hrAgBlocos || []).forEach(function (fn) { try { var r = fn(h); if (r) html += r; } catch (e) { console.warn('bloco extra:', e); } });
    html += '<div style="text-align:right;margin:-2px 0 8px;"><button class="hra-btn mut" onclick="hrConfigFila()">⚙️ Ajustar fila</button></div>';
    return html;
  }
  function injetarBlocos() {
    try {
      var el = document.getElementById('agList'); if (!el) return;
      css();
      var ant = document.getElementById('hrAutoBox'); if (ant) ant.remove();
      var html = blocoAgenda(); if (!html) return;
      el.insertAdjacentHTML('afterbegin', '<div id="hrAutoBox">' + html + '</div>');
    } catch (e) { console.error('hr-auto injetarBlocos:', e); }
  }
  function envolverRenderAg() {
    if (typeof window.renderAg !== 'function' || window.renderAg.__hrAuto) return;
    var orig = window.renderAg;
    window.renderAg = function () {
      var r = orig.apply(this, arguments);
      injetarBlocos();
      return r;
    };
    window.renderAg.__hrAuto = true;
  }

  window.__hrAg = {
    hoje: hoje, add: add, diff: diff, esc: esc, norm: norm, fdb: fdb, primeiroNome: primeiroNome, pd: pd, dow: dow,
    jobsAtivos: jobsAtivos, achaJobPorId: achaJobPorId, achaQ: achaQ, achaJobPorTexto: achaJobPorTexto, etapaDe: etapaDe,
    jaComecou: jaComecou, salvar: salvar, logJob: logJob, responderChat: responderChat, planoFila: planoFila, aplicarPlano: aplicarPlano,
    proxUtil: proxUtil, somaUteis: somaUteis, uteisEntre: uteisEntre, util: util, parseData: parseData, garantirHistorico: garantirHistorico
  };

  // ── arranque ───────────────────────────────────────────────────
  function iniciar() {
    envolverRenderAg();
    envolverContrato();
    envolverAgendar();
    try { sincronizar(); } catch (e) {}
    setTimeout(function () { envolverRenderAg(); envolverContrato(); envolverAgendar(); }, 1500);           // garante, caso outro módulo troque renderAg depois
    setTimeout(function () { try { renderAg(); } catch (e) {} }, 1800);
    setTimeout(function () { window.hrCheckinDiario(false); }, 3500);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { setTimeout(function () { window.hrCheckinDiario(false); }, 800); }
    });
    setInterval(function () { window.hrCheckinDiario(false); }, 30 * 60 * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
