// ═══════════════════════════════════════════════════════════════════════════
// app-fin-conferencia.js — CONFERÊNCIA DO EXTRATO (v2: + cadastro de clientes vindo do bot)
//   O bot manda (GET /bot/fin/tarefa) as linhas lidas dos prints do extrato do Mercado Pago; o app compara com as
//   finanças (DB.t) e devolve o resultado (POST /bot/fin/tarefa/resultado). Depois o bot manda as correções que o
//   Sr. Hangel aprovou no WhatsApp: renomear, adicionar e apagar lançamentos.
//   Só mexe em lançamentos do MERCADO PAGO (dinheiro, outras contas e lançamentos à mão nunca são apontados como sobrando).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var POLL_MS = 8000, busy = false, feitos = {};
  var RE_BANCO = /\b(institui|pagamentos?|banco|bank|caixa econ|nu ?pag|nubank|picpay|mercado ?pago|stone|pagseguro|pagbank|inter\b|c6|sicoob|sicredi|bradesco|ita[uú]|santander|cooperativa|cr[eé]dito|financeira|neon|original|safra|btg|cora\b|asaas|unicred|banrisul|digio|recargapay|s\.?\s?a\.?$)/i;
  var RE_INTERNO = /reserv|rendiment|cofrinho|caixinha|dinheiro (guardado|retirado)|transfer[eê]ncia (entre|para) (minha|sua)s? conta|resgate|aplica[cç][aã]o/i;
  var RE_GENERICO_IN = /^recebido de (cliente|payment|pagamento|mercado pago)\b/i;
  var RE_GENERICO_OUT = /^(pix enviado|pagamento com pix|payment|pagamento|transfer[eê]ncia enviada)\b/i;

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function api(path, opts) { opts = opts || {}; opts.headers = _botHeaders(); return fetch(base() + path, opts).then(function (r) { return r.json(); }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function titulo(s) { return String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (x) { return x.toLowerCase(); }); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 86400000); }
  function ehMP(t) { return !!(t.mpId || t.origem === 'mpx' || t.origem === 'mp' || /mercado ?pago/i.test(t.desc || '')); }
  function primeiroNome(n) { return norm(n).split(' ').filter(function (w) { return w.length > 2; })[0] || ''; }

  function conferir(linhas) {
    var trans = (DB.t || []).filter(function (t) { return t && (t.type === 'in' || t.type === 'out') && t.date; });
    var usados = {}, res = { batem: 0, renomear: [], faltamIn: [], faltamOut: [], sobrando: [], ignoradas: 0 };
    var validas = linhas.filter(function (l) {
      if (RE_INTERNO.test((l.nome || '') + ' ' + (l.tipo || ''))) { res.ignoradas++; return false; }
      return l.data && l.valor > 0;
    });
    var datas = validas.map(function (l) { return l.data; }).sort();
    if (!datas.length) return res;
    res.periodo = [datas[0], datas[datas.length - 1]];
    // linhas com valor parecido primeiro as de data exata, depois ±1 dia; dentro disso prefere lançamento do MP e com o nome
    validas.forEach(function (l) {
      var cands = trans.filter(function (t) { return !usados[t.id] && t.type === l.sentido && Math.abs((Number(t.value) || 0) - l.valor) < 0.011 && Math.abs(dias(t.date, l.data)) <= 1; });
      var pn = primeiroNome(l.nome);
      cands.sort(function (a, b) {
        var sa = (a.date === l.data ? 4 : 0) + (ehMP(a) ? 2 : 0) + (pn && norm(a.desc).indexOf(pn) >= 0 ? 1 : 0);
        var sb = (b.date === l.data ? 4 : 0) + (ehMP(b) ? 2 : 0) + (pn && norm(b.desc).indexOf(pn) >= 0 ? 1 : 0);
        return sb - sa;
      });
      var t = cands[0];
      var nomeBom = (l.nome && !RE_BANCO.test(l.nome)) ? titulo(l.nome) : '';
      if (!t) { (l.sentido === 'in' ? res.faltamIn : res.faltamOut).push({ data: l.data, hora: l.hora, valor: l.valor, nome: l.nome || '', nomeBom: nomeBom, tipo: l.tipo || '' }); return; }
      usados[t.id] = 1; res.batem++;
      if (!nomeBom) return;
      var d = String(t.desc || ''), nd = norm(d);
      if (pn && nd.indexOf(pn) >= 0) return; // já tem o nome
      var leitura = (typeof window.finNomeLer === 'function') ? window.finNomeLer(t) : null;
      var para = '';
      if (l.sentido === 'in' && (RE_GENERICO_IN.test(d) || (leitura && leitura.semNome))) para = 'Recebido de ' + nomeBom + ' (Pix Mercado Pago)';
      else if (l.sentido === 'out' && ehMP(t)) {
        var semSufixo = d.replace(/\s*\((pix )?mercado pago\)\s*$/i, '');
        para = (RE_GENERICO_OUT.test(semSufixo) ? 'Pix para ' + nomeBom : semSufixo + ' — ' + nomeBom) + ' (Mercado Pago)';
      }
      if (para && para !== d) res.renomear.push({ id: t.id, de: d, para: para.slice(0, 100), valor: l.valor, data: t.date, cli: l.sentido === 'in' ? nomeBom : undefined });
    });
    trans.forEach(function (t) {
      if (usados[t.id] || !ehMP(t) || t.date < res.periodo[0] || t.date > res.periodo[1]) return;
      res.sobrando.push({ id: t.id, type: t.type, value: Number(t.value) || 0, date: t.date, desc: String(t.desc || '').slice(0, 80) });
    });
    res.faltamOut = res.faltamOut.slice(0, 60); res.faltamIn = res.faltamIn.slice(0, 60);
    return res;
  }

  function aplicar(ops) {
    var feitosN = 0, erros = 0;
    (ops || []).forEach(function (o) {
      if (o.op === 'renomear') { var t = (DB.t || []).find(function (x) { return x.id == o.id; }); if (!t) { erros++; return; } t.desc = o.desc; if (o.cli) t.cli = o.cli; feitosN++; }
      else if (o.op === 'del') { var i = (DB.t || []).findIndex(function (x) { return x.id == o.id; }); if (i < 0) { erros++; return; } DB.t.splice(i, 1); feitosN++; }
      else if (o.op === 'add') {
        var ja = (DB.t || []).some(function (x) { return x.type === o.type && Math.abs((Number(x.value) || 0) - o.value) < 0.011 && x.date === o.date && norm(x.desc) === norm(o.desc); });
        if (ja) return;
        var nt = { id: Date.now() + Math.floor(Math.random() * 1000), type: o.type, value: Number(o.value) || 0, date: o.date, desc: o.desc, origem: 'mpx', conferido: true };
        if (o.cat) nt.cat = o.cat; if (o.cli) nt.cli = o.cli;
        DB.t.unshift(nt); feitosN++;
      }
    });
    if (feitosN) {
      try { DB.sv(); } catch (e) {}
      try { if (typeof renderFin === 'function' && document.querySelector('.fin-list')) renderFin(); } catch (e) {}
      if (typeof toast === 'function') toast('🧾 Finanças conferidas: ' + feitosN + ' ajuste(s)');
    }
    return { feitos: feitosN, erros: erros };
  }

  // v2: cliente mandado pelo bot (contato do Sr. Hangel, cliente de pedido) → banco de clientes do app
  function cliente(t) {
    if (typeof CLDB === 'undefined' || !t.nome) return { feitos: 0 };
    var l = CLDB.get(), tel = String(t.tel || '').replace(/\D/g, ''), u8 = tel.slice(-8), nm = norm(t.nome);
    var c = l.find(function (x) { var xt = String(x.tel || x.telefone || '').replace(/\D/g, ''); return (u8 && xt && xt.slice(-8) === u8) || (nm && norm(x.nome || x.nm) === nm); });
    if (c) {
      var mud = {};
      if (tel && !String(c.tel || '').replace(/\D/g, '')) mud.tel = tel;
      if (t.cidade && !c.cidade) mud.cidade = t.cidade;
      if (Object.keys(mud).length) { CLDB.upd(c.id, mud); return { feitos: 1 }; }
      return { feitos: 0 };
    }
    CLDB.add({ nome: titulo(t.nome), tel: tel, cidade: t.cidade || '', obs: t.obs || '', origem: 'bot' });
    if (typeof toast === 'function') toast('👤 Cliente cadastrado pelo bot: ' + titulo(t.nome));
    return { feitos: 1 };
  }

  function ciclo() {
    if (busy || document.hidden || !base() || typeof DB === 'undefined' || !DB.t) return;
    busy = true;
    api('/bot/fin/tarefa').then(function (j) {
      var t = j && j.tarefa; if (!t || feitos[t.id]) return;
      feitos[t.id] = 1;
      var corpo = { id: t.id };
      if (t.tipo === 'conferir') corpo.resultado = conferir(t.linhas || []);
      else if (t.tipo === 'aplicar') { var r = aplicar(t.ops); corpo.feitos = r.feitos; corpo.erros = r.erros; }
      else if (t.tipo === 'cliente') { corpo.feitos = cliente(t).feitos; }
      return api('/bot/fin/tarefa/resultado', { method: 'POST', body: JSON.stringify(corpo) });
    }).catch(function () {}).then(function () { busy = false; });
  }
  window.finConferenciaAgora = ciclo;
  window._finConferir = conferir; window._finCliente = cliente; // usados em teste
  window.addEventListener('load', function () { setTimeout(function () { setInterval(ciclo, POLL_MS); ciclo(); }, 4000); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(ciclo, 800); });
})();
