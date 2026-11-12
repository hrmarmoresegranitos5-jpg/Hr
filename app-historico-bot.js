// ═══════════════════════════════════════════════════════════════════
// HISTÓRICO COMPLETO PARA O BOT (Etapa 1)
// Envia ao Worker TODOS os clientes e TODOS os orçamentos (inclusive os
// antigos e os arquivados no IndexedDB) em POST /bot/historico.
// Independe do snapshot normal (que corta orçamentos com mais de 12 meses).
// Carregar DEPOIS de app-secretaria.js (usa _getBotCfg e _botHeaders).
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrHistBot) return; // evita dois temporizadores se o script for carregado duas vezes
  window.__hrHistBot = true;
  var META = 'hr_hist_bot_meta';
  var enviando = false;

  function txt(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
  function num(v) { v = Number(v); return isFinite(v) ? Math.round(v * 100) / 100 : 0; }
  function dia(v) {
    if (!v) return '';
    if (typeof v === 'number') { var d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
  }

  function montar() {
    var clientes = [];
    try {
      ((typeof CLDB !== 'undefined' && CLDB.get && CLDB.get()) || []).forEach(function (c) {
        if (c && c.nome) clientes.push({ nome: txt(c.nome, 60), tel: txt(c.tel, 20), cidade: txt(c.cidade, 40) });
      });
    } catch (e) {}
    var vc = {}; clientes = clientes.filter(function (c) { var k = c.nome.toLowerCase() + '|' + c.tel.replace(/\D/g, ''); if (vc[k]) return false; vc[k] = 1; return true; });
    var orcamentos = [];
    ((typeof DB !== 'undefined' && DB.q) || []).forEach(function (q) {
      if (!q || !q.cli) return;
      orcamentos.push({
        id: txt(q.id, 30), orcNum: txt(q.orcNum, 30), projNum: txt(q.projNum, 30), cliente: txt(q.cli, 60), projeto: txt(q.tipo, 70), material: txt(q.mat, 50),
        m2: num(q.m2), valor: num(q.vista), prazo: num(q.parc), entrada: num(q.ent), status: txt(q.status, 15),
        data: dia(q.date || q.createdAt), arquivado: q._arquivado ? 1 : 0
      });
    });
    var vo = {}; orcamentos = orcamentos.filter(function (o) { var k = o.id ? 'id:' + o.id : [o.cliente.toLowerCase(), o.data, o.valor, o.projeto.toLowerCase()].join('|'); if (vo[k]) return false; vo[k] = 1; return true; });
    orcamentos.sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    return { geradoEm: new Date().toISOString(), clientes: clientes, orcamentos: orcamentos };
  }

  function hash(d) {
    var c = Object.assign({}, d); delete c.geradoEm;
    var s = JSON.stringify(c), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h + ':' + s.length;
  }

  function enviar(forcar) {
    if (typeof _getBotCfg !== 'function') return Promise.resolve({ ok: false, motivo: 'bot não configurado' });
    var cfg = _getBotCfg();
    if (!cfg.url || !cfg.key) return Promise.resolve({ ok: false, motivo: 'bot não configurado' });
    if (enviando) return Promise.resolve({ ok: false, motivo: 'envio em andamento' });
    var dados = montar(), h = hash(dados), meta = {};
    try { meta = JSON.parse(localStorage.getItem(META) || '{}'); } catch (e) {}
    if (!forcar && meta.hash === h) return Promise.resolve({ ok: true, enviado: false, motivo: 'sem mudanças' });
    var corpo = JSON.stringify(dados);
    if (corpo.length > 3900000) { // o Worker recusa acima de 4 MB; não insiste até os dados mudarem
      localStorage.setItem(META, JSON.stringify({ hash: h, em: Date.now(), recusado: 'grande' }));
      console.warn('[histórico-bot] grande demais (' + corpo.length + ' bytes); não enviado.');
      return Promise.resolve({ ok: false, motivo: 'grande demais' });
    }
    enviando = true;
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var corte = ctl ? setTimeout(function () { ctl.abort(); }, 30000) : null; // sem isso, uma conexão travada deixaria "enviando" preso para sempre
    return fetch(String(cfg.url).replace(/\/+$/, '') + '/bot/historico', {
      method: 'POST', headers: _botHeaders(), body: corpo, signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        enviando = false; if (corte) clearTimeout(corte);
        if (r.ok && j.ok) {
          localStorage.setItem(META, JSON.stringify({ hash: h, em: Date.now() }));
          console.log('[histórico-bot] enviado: ' + dados.clientes.length + ' clientes, ' + dados.orcamentos.length + ' orçamentos');
          return { ok: true, enviado: true, clientes: dados.clientes.length, orcamentos: dados.orcamentos.length };
        }
        console.warn('[histórico-bot] recusado:', r.status, j.error || '');
        return { ok: false, motivo: j.error || ('HTTP ' + r.status) };
      });
    }).catch(function (e) { enviando = false; if (corte) clearTimeout(corte); console.warn('[histórico-bot] falha:', e); return { ok: false, motivo: String(e && e.message || e) }; });
  }

  window.enviarHistoricoBot = enviar; // console: enviarHistoricoBot(true)

  // Gatilhos: ~25 s após abrir (dá tempo dos arquivados do IndexedDB carregarem) e a cada 5 min se mudou
  setTimeout(function () { enviar(false); }, 25000);
  setInterval(function () { enviar(false); }, 5 * 60 * 1000);
})();
