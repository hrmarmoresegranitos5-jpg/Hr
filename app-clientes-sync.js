// ═══════════════════════════════════════════════════════════════════
// BANCO DE CLIENTES ↔ BOT (v1)
// Mantém nomes e telefones certos nos dois lados:
//  1. Telefones que estão só nos orçamentos passam para a ficha do cliente.
//  2. O bot manda (GET /bot/contatos) todo cliente que já falou no WhatsApp,
//     os cartões de contato e os telefones do livro. Aqui:
//       - ficha com o mesmo telefone  → nada muda (já é o mesmo cliente);
//       - ficha com o mesmo nome e SEM telefone → ganha o telefone;
//       - ninguém parecido → vira ficha nova ("Veio pelo WhatsApp").
//  3. As fichas atualizadas voltam ao bot no próximo envio do histórico
//     (app-historico-bot.js), e ele passa a achar todos pelo nome.
// Carregar DEPOIS de app-clientes.js, app-secretaria.js e app-historico-bot.js.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrCliSync) return;
  window.__hrCliSync = true;
  var META = 'hr_cli_sync_meta';
  var rodando = false;

  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function fim8(t) { var d = dig(t); return d.length >= 8 ? d.slice(-8) : ''; }
  function telBonito(t) {
    var d = dig(t); if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function nomeBom(n) {
    n = String(n || '').trim();
    var letras = n.replace(/[^A-Za-zÀ-ÿ]/g, '');
    return letras.length >= 3 && !/^(cliente|contato|sem nome|desconhecido)$/i.test(n);
  }
  function parecidos(nome) {
    if (typeof _cliBuscar !== 'function') return [];
    return (_cliBuscar(nome, 90) || []).map(function (r) { return r.c; });
  }

  // 1. telefone dos orçamentos → ficha
  function telefonesDosOrcamentos(lista) {
    var n = 0;
    ((typeof DB !== 'undefined' && DB.q) || []).forEach(function (q) {
      if (!q || !q.cli || dig(q.tel).length < 10) return;
      var t8 = fim8(q.tel);
      if (lista.some(function (c) { return fim8(c.tel) === t8; })) return;
      var cand = parecidos(q.cli).filter(function (c) { return !dig(c.tel); });
      if (cand.length !== 1) return;
      cand[0].tel = telBonito(q.tel); n++;
    });
    return n;
  }

  // 2. contatos do bot → fichas
  function juntarContatos(lista, contatos) {
    var r = { tel: 0, novos: 0 };
    contatos.forEach(function (ct) {
      if (!ct || !ct.tel || !nomeBom(ct.nome)) return;
      var t8 = fim8(ct.tel);
      if (!t8 || lista.some(function (c) { return fim8(c.tel) === t8; })) return; // já existe com esse telefone
      var cand = parecidos(ct.nome);
      var semTel = cand.filter(function (c) { return !dig(c.tel); });
      if (semTel.length === 1 && cand.length === 1) { semTel[0].tel = telBonito(ct.tel); r.tel++; return; }
      if (cand.length) return; // mesmo nome com outro telefone (ou vários iguais): não mexe, pode ser outra pessoa
      if (ct.origem === 'perfil' && String(ct.nome).trim().split(/\s+/).length < 2) return; // só o apelido do WhatsApp: não vira ficha
      lista.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000), em: (typeof td === 'function' ? td() : ''),
        nome: String(ct.nome).trim().slice(0, 60), tel: telBonito(ct.tel), cidade: '', end: '',
        obs: ct.origem === 'livro' ? 'Telefone do livro de entregas do bot' : 'Veio pelo WhatsApp do bot', origemBot: ct.origem || 'whatsapp'
      });
      r.novos++;
    });
    return r;
  }

  function sincronizar(manual) {
    if (rodando || typeof CLDB === 'undefined') return Promise.resolve(null);
    var cfg = typeof _getBotCfg === 'function' ? _getBotCfg() : {};
    rodando = true;
    var lista = CLDB.get();
    var nOrc = telefonesDosOrcamentos(lista);
    var pega = (cfg.url && cfg.key && typeof _botHeaders === 'function')
      ? fetch(String(cfg.url).replace(/\/+$/, '') + '/bot/contatos', { headers: _botHeaders() })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      : Promise.resolve(null);
    return pega.then(function (j) {
      var r = j && Array.isArray(j.contatos) ? juntarContatos(lista, j.contatos) : { tel: 0, novos: 0 };
      if (nOrc || r.tel || r.novos) {
        CLDB.sv(lista);
        if (typeof window.enviarHistoricoBot === 'function') setTimeout(function () { window.enviarHistoricoBot(false); }, 1500);
        if (typeof window.hcRecarregar === 'function') window.hcRecarregar();
      }
      var res = { telefones: nOrc + r.tel, novos: r.novos, doBot: j ? (j.contatos || []).length : null, total: lista.length, comTel: lista.filter(function (c) { return dig(c.tel).length >= 10; }).length };
      try { localStorage.setItem(META, JSON.stringify({ em: Date.now(), res: res })); } catch (e) {}
      if (manual && typeof toast === 'function') {
        toast(res.doBot === null ? '⚠️ Não consegui falar com o bot agora'
          : '✓ Clientes em dia: ' + res.comTel + ' de ' + res.total + ' com WhatsApp' + (res.novos ? ' · ' + res.novos + ' novo(s)' : '') + (res.telefones ? ' · ' + res.telefones + ' telefone(s) completado(s)' : ''));
      } else if ((res.novos || res.telefones) && typeof toast === 'function') {
        toast('👥 ' + (res.novos ? res.novos + ' cliente(s) novo(s) do WhatsApp' : '') + (res.novos && res.telefones ? ' · ' : '') + (res.telefones ? res.telefones + ' telefone(s) completado(s)' : ''));
      }
      rodando = false;
      return res;
    }).catch(function (e) { rodando = false; console.warn('[clientes-sync]', e); return null; });
  }

  window.hrSincronizarClientes = sincronizar; // console / botão: hrSincronizarClientes(true)
  setTimeout(function () { sincronizar(false); }, 12000);
  setInterval(function () { sincronizar(false); }, 30 * 60 * 1000);
})();
