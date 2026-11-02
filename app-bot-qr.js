// app-bot-qr.js — QR code do sinal (cliente fechou pessoalmente na loja)
// Carregar DEPOIS de app-core.js, app-secretaria.js e app-botpedidos.js (usa _getBotCfg, _botHeaders, DB, _aplicarStatusOrc, _agendarAposAceite).
//
// Fluxo: no WhatsApp o dono escreve "qr code do João 50%". O Worker enfileira o pedido e este arquivo (app aberto) o busca:
//   preparar → acha o orçamento pendente pelo nome e devolve o valor do sinal (o Worker cria o Pix e manda o QR ao dono)
//   aceitar  → marca o orçamento como Aceito e manda para a Agenda (igual ao botão Aceito, sem abrir o modal de valor)
//   pago     → o Pix caiu: grava o sinal recebido no orçamento. NÃO lança nas Finanças: o próprio Worker já lançou a entrada
//              (Mercado Pago) e o app a importa pela rotina de finanças. Lançar aqui duplicaria o dinheiro.
(function () {
  var POLL_MS = 8000;
  var busy = false;
  var feitos = {}; // ids já tratados nesta sessão (o Worker reoferece o item se a resposta demorar)

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function r2(n) { return Math.round(((+n || 0) + 1e-9) * 100) / 100; }
  function hoje() { try { return td(); } catch (e) { return new Date().toISOString().slice(0, 10); } }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = _botHeaders();
    return fetch(base() + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._http = r.status; return j; });
    });
  }
  function responder(item, corpo) {
    corpo.id = item.id;
    return api('/bot/qr/resultado', { method: 'POST', body: JSON.stringify(corpo) }).catch(function () {});
  }

  function statusDe(q) { return q.status === 'aprovado' ? 'aceito' : (q.status || 'pendente'); }
  function totalDe(q) {
    try { if (q.formaPag === 'misto' && typeof _mistoCalc === 'function') return r2(_mistoCalc(q).total); } catch (e) {}
    return r2(q.vista);
  }
  function porId(id) { return (DB.q || []).filter(function (x) { return String(x.id) === String(id); })[0] || null; }

  // Orçamentos do cliente que ainda aceitam sinal: pendentes, ou aceitos com saldo a receber
  function candidatos(nome) {
    var busca = norm(nome).split(' ').filter(Boolean);
    if (!busca.length) return [];
    return (DB.q || []).filter(function (q) {
      var st = statusDe(q);
      if (st === 'concluido' || st === 'perdido') return false;
      var tk = norm(q.cli).split(' ');
      var casa = busca.every(function (b) { return tk.some(function (t) { return t === b || t.indexOf(b) === 0; }); });
      if (!casa) return false;
      var total = totalDe(q);
      if (!(total > 0)) return false;
      return st === 'pendente' || r2(total - (q._valorRecebido || 0)) > 0.01;
    }).sort(function (a, b) { return (+b.id || 0) - (+a.id || 0); });
  }

  function preparar(item) {
    var q = null;
    if (item.qId) q = porId(item.qId);
    else {
      var lista = candidatos(item.nome);
      if (!lista.length) return { ok: false, erro: 'não achei orçamento pendente com o nome "' + item.nome + '" no Histórico do aplicativo.' };
      if (lista.length > 1) {
        return { ok: false, erro: 'mais de um orçamento', candidatos: lista.slice(0, 3).map(function (x) { return { id: String(x.id), cliente: x.cli, tipo: x.tipo || 'Serviço', total: totalDe(x) }; }) };
      }
      q = lista[0];
    }
    if (!q) return { ok: false, erro: 'esse orçamento não existe mais no aplicativo.' };
    var total = totalDe(q), saldo = r2(total - (q._valorRecebido || 0));
    if (!(total > 0)) return { ok: false, erro: 'o orçamento de ' + q.cli + ' está sem valor.' };
    if (saldo <= 0.01) return { ok: false, erro: 'o orçamento de ' + q.cli + ' já está totalmente recebido.' };
    var pct = item.pct || 50;
    var valor = item.valorFixo ? r2(item.valorFixo) : r2(total * pct / 100);
    if (valor > saldo) valor = saldo; // nunca cobra mais do que falta
    if (item.valorFixo) pct = Math.round(valor / total * 100);
    return { ok: true, dados: { qId: String(q.id), cliente: q.cli, tipo: q.tipo || 'Serviço', total: total, valor: valor, pct: pct } };
  }

  // Marca como Aceito e manda para a Agenda, como o botão Aceito (sem o modal de valor e sem lançar nas Finanças)
  function aceitar(q) {
    var st = statusDe(q), msg;
    if (st === 'pendente') {
      q._aceitoConfirmado = true; q._aceitoValor = q._aceitoValor || 0; q._aceitoForma = 'Pix'; q._aceitoData = hoje();
      _aplicarStatusOrc(q, 'aceito');
      var jaAgendado = (DB.j || []).some(function (j) { return j.qId === q.id; });
      if (jaAgendado) msg = 'Já estava na agenda.';
      else {
        var ok = false;
        try { ok = _agendarAposAceite(q); } catch (e) { console.warn('[bot-qr] agenda:', e); }
        if (!ok) { try { pendQ = q; salvarAgenda(); } catch (e) { console.warn('[bot-qr] salvarAgenda:', e); } msg = 'Falta confirmar a entrega na tela da agenda do aplicativo.'; }
        else msg = 'Enviado para a agenda.';
      }
      return { ok: true, mensagem: msg };
    }
    if (st === 'aceito') return { ok: true, mensagem: 'Já estava aceito.' };
    return { ok: false, erro: 'o orçamento está como "' + st + '" e não pode ser aceito.' };
  }

  function registrarPago(q, item) {
    q._qrPagos = q._qrPagos || [];
    if (q._qrPagos.indexOf(item.ref) > -1) return { ok: true, mensagem: 'Sinal já registrado.' };
    if (statusDe(q) === 'pendente') { var a = aceitar(q); if (!a.ok) return a; } // o aceite não chegou a rodar: faz agora
    var v = r2(item.valor);
    q._qrPagos.push(item.ref);
    q._valorRecebido = r2((q._valorRecebido || 0) + v);
    q._aceitoValor = r2((q._aceitoValor || 0) + v); q._aceitoForma = 'Pix'; q._aceitoData = hoje(); q._aceitoConfirmado = true;
    DB.sv();
    try { renderOrc(); } catch (e) {}
    try { toast('Pix de R$ ' + fm(v) + ' recebido: ' + (q.cli || 'cliente')); } catch (e) {}
    return { ok: true, mensagem: 'Sinal de R$ ' + fm(v) + ' registrado no orçamento.' };
  }

  function tratar(item) {
    if (feitos[item.id]) return Promise.resolve();
    feitos[item.id] = true;
    var r;
    try {
      if (item.tipo === 'preparar') r = preparar(item);
      else {
        var q = porId(item.qId);
        if (!q) r = { ok: false, erro: 'o orçamento não existe mais no aplicativo.' };
        else r = item.tipo === 'aceitar' ? aceitar(q) : item.tipo === 'pago' ? registrarPago(q, item) : { ok: false, erro: 'pedido desconhecido' };
      }
    } catch (e) {
      console.error('[bot-qr]', e);
      r = { ok: false, erro: 'erro no aplicativo: ' + String((e && e.message) || e).slice(0, 120) };
    }
    return responder(item, r);
  }

  function tick() {
    if (busy || !base() || document.hidden) return;
    busy = true;
    api('/bot/qr/fila').then(function (j) {
      var itens = (j && j._http === 200 && Array.isArray(j.itens)) ? j.itens : [];
      return itens.reduce(function (p, it) { return p.then(function () { return tratar(it); }); }, Promise.resolve());
    }).catch(function () {}).then(function () { busy = false; });
  }

  setInterval(tick, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  setTimeout(tick, 3000);
})();
