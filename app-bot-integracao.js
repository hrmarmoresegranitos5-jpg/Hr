// app-bot-integracao.js — ponte completa entre o app e o Worker do atendente (v1)
// Carregar DEPOIS de app-core.js, app-secretaria.js, app-botpedidos.js e app-bot-qr.js.
//
// O que faz (tudo com o app aberto e visível, usando a mesma URL/chave do painel "hr_bot_cfg"):
//   1. CAPACIDADES  POST /bot/capacidades   declara as ações que o agente do WhatsApp pode pedir ao app
//   2. COMANDOS     GET  /bot/comandos      busca ações aprovadas por você, executa e devolve o resultado
//                   POST /bot/comandos/resultado
//   3. ORÇAMENTOS   POST /bot/orcamentos/sync  mantém o Worker com a lista de orçamentos pendentes/com saldo,
//                   para o QR do sinal e as respostas do bot funcionarem MESMO com o app fechado
//   4. ERROS        POST /bot/erros         relata erros de JavaScript do app (você é avisado no WhatsApp)
(function () {
  'use strict';
  if (window.__botIntegracaoOk) return;
  window.__botIntegracaoOk = true;

  var CMD_MS = 10000;          // busca de comandos
  var SYNC_MS = 45000;         // confere se a lista de orçamentos mudou
  var CAP_MS = 6 * 3600000;    // redeclara as capacidades
  var busyCmd = false, busySync = false;
  var feitos = {};             // comandos já tratados nesta sessão
  var ultimoSync = '';
  var ultimaCap = 0, ultimoForce = Date.now();

  // ───────── utilidades ─────────
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function pronto() { try { return !!(base() && _getBotCfg().key); } catch (e) { return false; } }
  function r2(n) { return Math.round(((+n || 0) + 1e-9) * 100) / 100; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function hoje() { try { return td(); } catch (e) { return new Date().toISOString().slice(0, 10); } }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = _botHeaders();
    return fetch(base() + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._http = r.status; return j; });
    });
  }

  function statusDe(q) { return q.status === 'aprovado' ? 'aceito' : (q.status || 'pendente'); }
  function totalDe(q) {
    try { if (q.formaPag === 'misto' && typeof _mistoCalc === 'function') return r2(_mistoCalc(q).total); } catch (e) {}
    return r2(q.vista);
  }
  function orcs() { try { return DB.q || []; } catch (e) { return []; } }
  function porId(id) { return orcs().filter(function (x) { return String(x.id) === String(id); })[0] || null; }

  // orçamentos que ainda movimentam dinheiro: pendentes, ou aceitos com saldo a receber
  function ativos() {
    return orcs().filter(function (q) {
      var st = statusDe(q);
      if (st === 'concluido' || st === 'perdido') return false;
      var total = totalDe(q);
      if (!(total > 0)) return false;
      return st === 'pendente' || r2(total - (q._valorRecebido || 0)) > 0.01;
    });
  }

  // acha UM orçamento por id ou por nome; devolve { q } ou { erro, candidatos? }
  function localizar(p) {
    if (p.qId) { var q = porId(p.qId); return q ? { q: q } : { erro: 'esse orçamento não existe mais no aplicativo.' }; }
    var busca = norm(p.cliente).split(' ').filter(Boolean);
    if (!busca.length) return { erro: 'informe o nome do cliente ou o id do orçamento.' };
    var lista = ativos().filter(function (q) {
      var tk = norm(q.cli).split(' ');
      return busca.every(function (b) { return tk.some(function (t) { return t === b || t.indexOf(b) === 0; }); });
    }).sort(function (a, b) { return (+b.id || 0) - (+a.id || 0); });
    if (!lista.length) return { erro: 'não achei orçamento em aberto de "' + p.cliente + '".' };
    if (lista.length > 1) {
      return { erro: 'há mais de um orçamento de "' + p.cliente + '": ' + lista.slice(0, 3).map(function (x) { return x.cli + ' R$ ' + fm(totalDe(x)) + ' (id ' + x.id + ')'; }).join('; ') + '. Peça de novo com o id.' };
    }
    return { q: lista[0] };
  }

  // ───────── 1. capacidades ─────────
  var ACOES = [
    { acao: 'aceitar_orcamento', nome: 'Aceitar orçamento', descricao: 'Marca o orçamento do cliente como Aceito e manda para a Agenda (sem lançar valor nas Finanças).', parametros: { cliente: 'nome do cliente', qId: 'id do orçamento (opcional, use se houver mais de um)' }, confirmar: true },
    { acao: 'marcar_perdido', nome: 'Marcar orçamento como perdido', descricao: 'Marca como Perdido o orçamento pendente do cliente (cliente desistiu).', parametros: { cliente: 'nome do cliente', qId: 'id do orçamento (opcional)' }, confirmar: true },
    { acao: 'criar_nota', nome: 'Criar nota', descricao: 'Cria uma anotação em Notas do aplicativo (lembrete, medida, recado).', parametros: { texto: 'o que anotar', cliente: 'nome do cliente (opcional)', tipo: 'geral, medidas ou visita (opcional)' }, confirmar: false },
    { acao: 'agenda_etapa', nome: 'Mudar etapa na agenda', descricao: 'Muda a etapa de um serviço da Agenda: producao, pronto, entregue ou instalado (o pagamento continua sendo lançado pelo Sr. Hangel).', parametros: { cliente: 'nome do cliente', etapa: 'producao, pronto, entregue ou instalado' }, confirmar: true },
    { acao: 'agenda_data', nome: 'Mudar data de entrega na agenda', descricao: 'Muda a data prevista de entrega de um serviço da Agenda.', parametros: { cliente: 'nome do cliente', entrega: 'AAAA-MM-DD' }, confirmar: true },
    { acao: 'atualizar_bot', nome: 'Atualizar dados do bot', descricao: 'Reenvia agora ao Worker a lista de orçamentos em aberto e o A Receber.', confirmar: false }
  ];

  function declarar(forcar) {
    if (!pronto()) return Promise.resolve();
    if (!forcar && Date.now() - ultimaCap < CAP_MS) return Promise.resolve();
    ultimaCap = Date.now();
    return api('/bot/capacidades', { method: 'POST', body: JSON.stringify({ secoes: [], acoes: ACOES }) }).catch(function () { ultimaCap = 0; });
  }

  // ───────── 2. comandos ─────────
  function exAceitar(p) {
    var l = localizar(p); if (!l.q) return { ok: false, mensagem: l.erro };
    var q = l.q, st = statusDe(q);
    if (st === 'aceito') return { ok: true, mensagem: 'Orçamento de ' + q.cli + ' já estava aceito.' };
    if (st !== 'pendente') return { ok: false, mensagem: 'o orçamento de ' + q.cli + ' está como "' + st + '" e não pode ser aceito.' };
    q._aceitoConfirmado = true; q._aceitoValor = q._aceitoValor || 0; q._aceitoForma = q._aceitoForma || 'A combinar'; q._aceitoData = hoje();
    _aplicarStatusOrc(q, 'aceito');
    var msg;
    if ((DB.j || []).some(function (j) { return j.qId === q.id; })) msg = 'Já estava na agenda.';
    else {
      var ok = false;
      try { ok = _agendarAposAceite(q); } catch (e) { console.warn('[bot-int] agenda:', e); }
      if (ok) msg = 'Enviado para a agenda.';
      else { try { pendQ = q; salvarAgenda(); } catch (e) { console.warn('[bot-int] salvarAgenda:', e); } msg = 'Falta confirmar a entrega na tela da agenda do aplicativo.'; }
    }
    return { ok: true, mensagem: 'Orçamento de ' + q.cli + ' aceito. ' + msg };
  }

  function exPerdido(p) {
    var l = localizar(p); if (!l.q) return { ok: false, mensagem: l.erro };
    var q = l.q, st = statusDe(q);
    if (st === 'perdido') return { ok: true, mensagem: 'Orçamento de ' + q.cli + ' já estava como perdido.' };
    if (st !== 'pendente') return { ok: false, mensagem: 'só dá para marcar como perdido um orçamento pendente; o de ' + q.cli + ' está "' + st + '".' };
    _aplicarStatusOrc(q, 'perdido');
    return { ok: true, mensagem: 'Orçamento de ' + q.cli + ' marcado como perdido.' };
  }

  function exNota(p) {
    var texto = String(p.texto || '').trim(); if (!texto) return { ok: false, mensagem: 'falta o texto da nota.' };
    if (!Array.isArray(DB.n)) DB.n = [];
    var tipo = ['geral', 'medidas', 'visita'].indexOf(p.tipo) >= 0 ? p.tipo : 'geral';
    DB.n.unshift({ id: Date.now(), cliente: String(p.cliente || '').trim(), texto: texto.slice(0, 2000), tipo: tipo, origem: 'bot' });
    DB.sv(); try { if (typeof renderNotas === 'function') renderNotas(); } catch (e) {}
    return { ok: true, mensagem: 'Nota criada' + (p.cliente ? ' para ' + p.cliente : '') + '.' };
  }
  function acharJob(nome) {
    var busca = norm(nome).split(' ').filter(Boolean); if (!busca.length) return { erro: 'informe o nome do cliente.' };
    var l = (DB.j || []).filter(function (j) { var tk = norm(j.cli).split(' '); return busca.every(function (b) { return tk.some(function (t) { return t === b || t.indexOf(b) === 0; }); }); });
    var abertos = l.filter(function (j) { try { _migrateJobStage(j); } catch (e) {} return !j.done; });
    var lista = (abertos.length ? abertos : l).sort(function (a, b) { return (+b.id || 0) - (+a.id || 0); });
    if (!lista.length) return { erro: 'não achei serviço de "' + nome + '" na agenda.' };
    if (abertos.length > 1) return { erro: 'há ' + abertos.length + ' serviços em aberto de "' + nome + '" na agenda: ' + abertos.slice(0, 3).map(function (j) { return (j.desc || j.cat || 'serviço') + ' (entrega ' + (j.end || '?') + ')'; }).join('; ') + '.' };
    return { j: lista[0] };
  }
  function exEtapa(p) {
    var r = acharJob(p.cliente); if (!r.j) return { ok: false, mensagem: r.erro };
    var j = r.j, et = String(p.etapa || '').toLowerCase();
    if (JOB_STAGES.indexOf(et) < 0) return { ok: false, mensagem: 'etapa inválida (use producao, pronto, entregue ou instalado).' };
    if (et === 'instalado' && !j.instala) et = 'entregue';
    j.stage = et; _syncJobDone(j); DB.sv();
    try { renderAg(); updUrgDot(); } catch (e) {}
    return { ok: true, mensagem: (j.cli || 'Serviço') + ': etapa agora é ' + (typeof JOB_STAGE_LABEL !== 'undefined' && JOB_STAGE_LABEL[et] || et) + '.' };
  }
  function exData(p) {
    var r = acharJob(p.cliente); if (!r.j) return { ok: false, mensagem: r.erro };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.entrega || ''))) return { ok: false, mensagem: 'data inválida (use AAAA-MM-DD).' };
    var j = r.j, antes = j.end; j.end = p.entrega; if (j.start && j.start > j.end) j.start = j.end; DB.sv();
    try { renderAg(); updUrgDot(); } catch (e) {}
    return { ok: true, mensagem: (j.cli || 'Serviço') + ': entrega mudou de ' + (antes || '—') + ' para ' + p.entrega + '.' };
  }

  function exAtualizar() {
    return sincronizar(true).then(function () {
      try { if (typeof sincBot === 'function') sincBot(true); } catch (e) {}
      return { ok: true, mensagem: 'Lista de orçamentos reenviada ao Worker.' };
    });
  }

  function executar(c) {
    var p = c.parametros || {};
    try {
      if (c.acao === 'aceitar_orcamento') return Promise.resolve(exAceitar(p));
      if (c.acao === 'marcar_perdido') return Promise.resolve(exPerdido(p));
      if (c.acao === 'criar_nota') return Promise.resolve(exNota(p));
      if (c.acao === 'agenda_etapa') return Promise.resolve(exEtapa(p));
      if (c.acao === 'agenda_data') return Promise.resolve(exData(p));
      if (c.acao === 'atualizar_bot') return exAtualizar();
      return Promise.resolve({ ok: false, mensagem: 'ação desconhecida neste aplicativo: ' + c.acao });
    } catch (e) {
      console.error('[bot-int]', e);
      return Promise.resolve({ ok: false, mensagem: 'erro no aplicativo: ' + String((e && e.message) || e).slice(0, 120) });
    }
  }

  function cicloComandos() {
    if (busyCmd || document.hidden || !pronto()) return;
    busyCmd = true;
    api('/bot/comandos').then(function (j) {
      var lista = (j && j._http === 200 && Array.isArray(j.comandos)) ? j.comandos : [];
      return lista.reduce(function (seq, c) {
        return seq.then(function () {
          if (feitos[c.id]) return;
          feitos[c.id] = true;
          return executar(c).then(function (r) {
            return api('/bot/comandos/resultado', { method: 'POST', body: JSON.stringify({ id: c.id, ok: !!r.ok, mensagem: String(r.mensagem || '').slice(0, 280) }) }).catch(function () {});
          });
        });
      }, Promise.resolve());
    }).catch(function () {}).then(function () { busyCmd = false; });
  }

  // ───────── 3. sync de orçamentos ─────────
  function sincronizar(forcar) {
    if (busySync || !pronto()) return Promise.resolve();
    var itens;
    try {
      itens = ativos().map(function (q) { return { qId: String(q.id), cliente: String(q.cli || ''), tipo: String(q.tipo || 'Serviço'), total: totalDe(q) }; });
    } catch (e) { return Promise.resolve(); }
    var s = JSON.stringify(itens);
    if (!forcar && s === ultimoSync) return Promise.resolve();
    busySync = true;
    return api('/bot/orcamentos/sync', { method: 'POST', body: JSON.stringify({ itens: itens }) })
      .then(function (r) { if (r && r._http === 200) ultimoSync = s; })
      .catch(function () {})
      .then(function () { busySync = false; });
  }

  // ───────── 4. relato de erros ─────────
  var erros = {}, nErros = 0;
  function relatar(msg, src, line, stack) {
    try {
      if (!pronto() || nErros >= 8) return;
      msg = String(msg || '').slice(0, 300);
      var k = msg + '|' + src + '|' + line;
      if (!msg || erros[k]) return;
      erros[k] = true; nErros++;
      var tela = '';
      try { var ativa = document.querySelector('.page.on, .pg.on, .tab-content.on, section.on'); tela = ativa ? (ativa.id || '') : ''; } catch (e) {}
      api('/bot/erros', { method: 'POST', body: JSON.stringify({ msg: msg, src: String(src || ''), line: line || 0, stack: String(stack || '').slice(0, 600), tela: tela }) }).catch(function () {});
    } catch (e) {}
  }
  window.addEventListener('error', function (ev) {
    if (!ev || !ev.message) return;
    relatar(ev.message, ev.filename, ev.lineno, ev.error && ev.error.stack);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    // falha de rede ao procurar atualização do app (sem internet ou GitHub publicando): não é erro do app
    if (/ServiceWorker|Failed to fetch|NetworkError|Load failed|network error/i.test(String((r && r.message) || r || ''))) return;
    relatar('Promise rejeitada: ' + String((r && r.message) || r || ''), '', 0, r && r.stack);
  });

  // ───────── partida ─────────
  function tick() { declarar(false); cicloComandos(); }
  setInterval(tick, CMD_MS);
  setInterval(function () { if (!document.hidden) sincronizar(Date.now() - ultimoForce > 5 * 3600000 && (ultimoForce = Date.now(), true)); }, SYNC_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); sincronizar(false); } });
  setTimeout(function () { declarar(true); sincronizar(true); cicloComandos(); }, 4000);

  window.botIntegracaoAgora = function () { declarar(true); sincronizar(true); cicloComandos(); };
})();
