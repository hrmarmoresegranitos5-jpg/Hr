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
        if (!j || !j.qId) return;
        var q = qs.find(function (x) { return String(x.id) === String(j.qId); });
        if (!q) return;
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

  // ═════════════════════════════════════════════════════════════
  //  FILA INTELIGENTE (6)
  // ═════════════════════════════════════════════════════════════
  function jaComecou(j, h) { return j.start <= h || etapaDe(j) !== 'producao'; }
  function ocupaAte(j, h) {
    if (etapaDe(j) !== 'producao') return h;
    if (j.oficinaFim) return maxd(j.oficinaFim, h);
    return maxd(j.end, h);
  }

  // Calcula como a fila deveria ficar. Não altera nada.
  function planoFila() {
    var h = hoje();
    var lista = jobsAtivos().slice().sort(function (a, b) {
      var ua = a.urgente ? 0 : 1, ub = b.urgente ? 0 : 1;
      if (ua !== ub) return ua - ub;
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      return String(a.id) < String(b.id) ? -1 : 1;
    });
    var cursor = h;
    lista.forEach(function (j) {               // quem já está em produção segura a oficina (urgente não segura)
      if (jaComecou(j, h) && !j.urgente) cursor = maxd(cursor, ocupaAte(j, h));
    });
    var mud = [];
    lista.forEach(function (j) {
      if (jaComecou(j, h)) return;
      if (j.fixo) { cursor = maxd(cursor, j.end); return; }
      var dur = Math.max(1, diff(j.start, j.end));
      var ns = maxd(h, cursor), ne = add(ns, dur);
      cursor = ne;
      if (ns !== j.start || ne !== j.end) {
        mud.push({ job: j, de: { s: j.start, e: j.end }, para: { s: ns, e: ne }, tipo: ns < j.start ? 'adiantar' : 'atrasar' });
      }
    });
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
    } else {
      return { ok: false, texto: '⚠️ Não entendi o que aconteceu com ' + j.cli + '.', acoes: [] };
    }
    if (opcoes && opcoes.fim && etapa !== 'previsao') {           // "terminamos o corte e entrega dia X"
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
  function responderChat(texto, acoes) {
    try {
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

  // ── Modal de sugestões da fila ─────────────────────────────────
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
        'início ' + fdb(x.de.s) + ' → <b>' + fdb(x.para.s) + '</b> · entrega ' + fdb(x.de.e) + ' → <b>' + fdb(x.para.e) + '</b></div></label>';
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
      var j = achaJobPorTexto(s);
      if (!j) return false;
      var data = parseData(texto), etapa = null, valor = null, fim = null;
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

  // Ação vinda da IA: {"action":"andamento","cli":"","etapa":"corte|pronto|previsao|atraso","termina":"YYYY-MM-DD","dias":2}
  window.hrAndamentoPorCli = function (data) {
    var s = norm(data.cli || '');
    var j = achaJobPorTexto(s) || jobsAtivos().find(function (x) { return norm(x.cli).indexOf(s) !== -1; });
    if (!j) return { texto: '⚠️ Serviço de **' + (data.cli || '?') + '** não encontrado na agenda.', acoes: [] };
    var etapa = data.etapa || (data.termina ? 'previsao' : 'corte');
    var valor = etapa === 'atraso' ? +data.dias : data.termina;
    return window.hrAndamento(j.id, etapa, valor, { fim: etapa !== 'previsao' ? data.termina : null });
  };

  // ═════════════════════════════════════════════════════════════
  //  "COMO ESTAMOS?" DIÁRIO DA SECRETÁRIA
  // ═════════════════════════════════════════════════════════════
  window.hrCheckinDiario = function (forcar) {
    try {
      if (typeof _chatBotReply !== 'function' || typeof _chat === 'undefined') return false;
      if (!Array.isArray(_chat.history) && typeof _chatLoad === 'function') _chatLoad();   // garante o histórico carregado
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
      t += '\n\nMe conta o que andou. Ex.: *“terminamos de cortar a cozinha da Maria”* ou *“Maria termina dia 15”*. Eu reorganizo a fila para ninguém atrasar.';
      var acoes = [];
      prod.slice(0, 3).forEach(function (j) {
        var id = JSON.stringify(String(j.id)), n = primeiroNome(j.cli);
        acoes.push({ label: '✂️ ' + n + ': corte pronto', fn: 'hrBotao(' + id + ",'corte')" });
        acoes.push({ label: '📅 ' + n + ': nova data', fn: 'hrPerguntaData(' + id + ')' });
      });
      comecaHoje.slice(0, 2).forEach(function (j) {
        acoes.push({ label: '📐 Medidas conferidas: ' + primeiroNome(j.cli), fn: 'hrMedicaoFeita(' + JSON.stringify(String(j.id)) + ')' });
      });
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
        '<button class="hra-btn" onclick="hrPerguntaData(' + esc(id) + ')">📅 Mudar data</button></div></div>';
    });
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

  // ── arranque ───────────────────────────────────────────────────
  function iniciar() {
    envolverRenderAg();
    try { sincronizar(); } catch (e) {}
    setTimeout(envolverRenderAg, 1500);           // garante, caso outro módulo troque renderAg depois
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
