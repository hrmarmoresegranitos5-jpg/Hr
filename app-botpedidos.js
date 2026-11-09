// app-botpedidos.js — Etapa 1: pedido do WhatsApp → orçamento no app → PDF → volta pro WhatsApp
// Carregar DEPOIS de app-core.js e app-secretaria.js (usa _getBotCfg, _botHeaders, ambientes, calcular, gerarPDF).
(function () {
  var POLL_MS = 5000;       // consulta a fila a cada 5 s enquanto o app está aberto e visível
  var PDF_TIMEOUT_MS = 60000;
  var busy = false;
  var cotados = {};         // pedidos já cotados (valor enviado ao Worker) nesta sessão
  var tent = {};            // tentativas por falha de rede (3 e desiste)
  var feitos = {};          // ids já tratados nesta sessão (evita repetir se o Worker demorar a atualizar)

  // Acabamento do Worker → chave do SV_DEFS de cada tipo
  var ACB = {
    Soleira:  { sem: ['sol_sem', 0], '1_lado': ['sol1', 1], '2_lados': ['sol2', 2], '45': ['sol_45', 1] },
    Peitoril: { sem: ['peit_sem', 0], '1_lado': ['peit_acb1', 1], '2_lados': ['peit_acb2', 2] }
  };

  function base() { return String(_getBotCfg().url || '').replace(/\/+$/, ''); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = _botHeaders();
    return fetch(base() + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._http = r.status; return j; });
    });
  }

  var RE_REDE = /failed to fetch|networkerror|network request failed|load failed|timeout|timed out|abort|demorou demais/i;
  function revisar(ped, motivo) {
    // Falha de rede não é erro de dados: o pedido continua na fila e o app tenta de novo (até 3 vezes)
    if (RE_REDE.test(String(motivo || ''))) { tent[ped.id] = (tent[ped.id] || 0) + 1; if (tent[ped.id] >= 3) feitos[ped.id] = true; }
    else feitos[ped.id] = true;
    return api('/bot/pedidos/status', { method: 'POST', body: JSON.stringify({ id: ped.id, status: 'revisar', motivo: motivo }) }).catch(function () {});
  }

  // Cliente do WhatsApp sempre vai para o banco de clientes, sem perguntar (por telefone ou nome parecido)
  function salvarCliente(ped) {
    try {
      var nome = String(ped.nome || '').trim(), tel = String(ped.numero || '').replace(/^55/, '');
      if (!nome || typeof CLDB === 'undefined') return;
      var telN = tel.replace(/\D/g, ''), ja = null;
      if (telN) ja = CLDB.get().filter(function (c) { return String(c.tel || '').replace(/\D/g, '') === telN; })[0] || null;
      if (!ja && typeof _cliBuscar === 'function') { var r = _cliBuscar(nome, 80); if (r.length) ja = r[0].c; }
      if (ja) { if (tel && !ja.tel) CLDB.upd(ja.id, { tel: tel }); return; }
      CLDB.add({ nome: nome, tel: tel, cidade: '', end: '', obs: 'Cliente via WhatsApp (bot)' });
    } catch (e) { console.warn('[bot] salvar cliente:', e); }
  }

  // Pedra do pedido → pedra do catálogo (nome exato; senão uma única que contenha o texto)
  function acharPedra(nome) {
    var n = norm(nome), todas = (CFG && CFG.stones) || [];
    var ex = todas.filter(function (s) { return norm(s.nm) === n; });
    if (ex.length === 1) return ex[0];
    var parc = todas.filter(function (s) { return norm(s.nm).indexOf(n) > -1 || n.indexOf(norm(s.nm)) > -1; });
    return parc.length === 1 ? parc[0] : null;
  }

  // O formulário de Orçamento é global: guarda o que o dono estava digitando e devolve depois
  function guardarTela() {
    var campos = {};
    ['oCliente', 'oTel', 'oCidade', 'oEnd', 'oObs'].forEach(function (id) {
      var el = document.getElementById(id); campos[id] = el ? el.value : '';
    });
    // sobra de um pedido do bot (rascunho salvo quando o app foi fechado no meio): não é trabalho do dono
    var sobra = /Pedido via WhatsApp \(bot\)/.test(campos.oObs || '');
    return { amb: ambientes, campos: campos, pend: pendQ, edit: pendEditId, sobra: sobra };
  }
  function novoSilencioso() { // o mesmo "Novo" do app, sem a pergunta de confirmação
    var oc = window.confirm; window.confirm = function () { return true; };
    try { novoOrcamento(); } catch (e) {} finally { window.confirm = oc; }
  }
  function restaurarTela(s) {
    if (s.sobra) { novoSilencioso(); return; }
    ambientes = s.amb; pendQ = s.pend; pendEditId = s.edit;
    Object.keys(s.campos).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = s.campos[id]; });
    try { renderAmbientes(); } catch (e) {}
    var res = document.getElementById('resArea');
    if (res && !s.pend) res.style.display = 'none';
  }

  // Um ambiente do app para cada item do pedido (pedido simples = 1 item)
  function ambienteDoItem(item, stone, t) {
    var tipo = item.ambiente;                      // 'Soleira' | 'Peitoril'
    var acb = (ACB[tipo] || {})[item.acabamento];
    if (!acb) throw new Error('Acabamento "' + item.acabamento + '" não existe para ' + tipo + '.');
    var sv = {};
    sv[acb[0]] = { lados: acb[1] };
    if (tipo === 'Peitoril') sv.peit_reto = { ml: 0, altCm: 6, q: 1, qty: 1 };
    return {
      id: t, tipo: tipo, selCuba: null, acState: {}, svState: sv, selMat: stone.id,
      pecas: item.pecas.map(function (p, i) { return { id: t + i + 1, desc: p.desc || '', w: p.comp_cm, h: p.larg_cm, q: p.qtd || 1 }; })
    };
  }

  // Pedido de CLIENTE (atendimento por IA): vem com interesse, cor e peças soltas. Completa o que falta e
  // anota o que foi presumido; esses avisos aparecem para o dono na hora de aprovar o orçamento.
  function normalizar(p) {
    if (p.origem === 'dono' || (p.ambiente && p.acabamento)) return p;
    var amb = /peitoril/i.test(p.interesse || '') ? 'Peitoril' : /soleira/i.test(p.interesse || '') ? 'Soleira' : '';
    var pecas = (p.pecas || []).map(function (x) {
      return { desc: x.tipo || amb, comp_cm: +x.comp_cm || 0, larg_cm: +x.larg_cm || 0, qtd: Math.max(1, +x.qtd || 1) };
    }).filter(function (x) { return x.comp_cm > 0 && x.larg_cm > 0; });
    var avisos = ['Calculado com preço à vista.'];
    if (!p.acabamento) avisos.unshift('Acabamento não informado pelo cliente: calculei sem acabamento.');
    if (p.instalacao === 'com') avisos.push('Cliente quer instalação: não incluída no cálculo.');
    return Object.assign({}, p, {
      ambiente: amb, pedra: String(p.cor || '').trim(), pecas: pecas, acabamento: p.acabamento || 'sem',
      pagamento: 'vista', prazo_modo: p.prazo_modo || 'manual', prazo_dias: p.prazo_dias || 1, _avisos: avisos
    });
  }

  function itensDe(ped) {
    return (ped.itens && ped.itens.length) ? ped.itens : [{ ambiente: ped.ambiente, pecas: ped.pecas, acabamento: ped.acabamento }];
  }

  function montarQ(ped, stone) {
    var t = Date.now();
    salvarCliente(ped);
    novoSilencioso(); // começa de um orçamento limpo (zera também urgência e ajustes do anterior)
    var novos = itensDe(ped).map(function (it, i) { return ambienteDoItem(it, stone, t + i * 100); });
    ambientes = novos;
    pendQ = null; pendEditId = null;
    document.getElementById('oCliente').value = ped.nome;
    document.getElementById('oTel').value = String(ped.numero || '').replace(/^55/, '');
    ['oCidade', 'oEnd'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    var obs = document.getElementById('oObs'); if (obs) obs.value = 'Pedido via WhatsApp (bot).';
    renderAmbientes();
    calcular();                                    // cria o orçamento e preenche pendQ
    var q = pendQ;
    if (!q) throw new Error('O app não conseguiu calcular (confira as medidas e a pedra).');
    q.formaPag = ped.pagamento === 'parcelado' ? 'parcelado' : 'vista';
    window._formaPagEscolhida = q.formaPag;
    if (ped.prazo_modo === 'manual') { q.prazoModo = 'manual'; q.prazoDias = ped.prazo_dias; }
    q.origemBot = ped.id;
    try { DB.sv(); } catch (e) {}
    return q;
  }

  function blobParaBase64(blob) {
    return new Promise(function (ok, erro) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1]); };
      r.onerror = function () { erro(new Error('Falha ao ler o PDF.')); };
      r.readAsDataURL(blob);
    });
  }

  // gerarPDF() abre a tela de PDF; o gancho window._botPdfHook (patch em app-core.js) recebe o arquivo pronto
  // Prazo já combinado pelo WhatsApp: entrega o prazo pronto ao app-pdf-prazo.js (ele não abre o modal)
  function definirPrazo(ped, q) {
    var hoje = td(), dias = +ped.prazo_dias || 0;
    var dataEst = /^\d{4}-\d{2}-\d{2}$/.test(String(ped.entrega_prevista || '')) ? ped.entrega_prevista : (dias > 0 ? addD(hoje, dias) : '');
    if (!dataEst) return false;
    if (!(dias > 0)) dias = Math.max(1, Math.round((new Date(dataEst + 'T00:00:00') - new Date(hoje + 'T00:00:00')) / 86400000));
    var last = lastEnd();
    window._pdfPrazoData = { dias: dias, base: hoje, dataEst: dataEst, lastEnd: null,
      emProd: (DB.j || []).filter(function (j) { return !j.done; }).length, hoje: hoje, isUrgent: (window._urgPct || 0) > 0 };
    q.prazoDias = dias; q.prazoInicio = hoje; q.prazoEntrega = dataEst; q.prazoModo = 'manual'; q.prazoUrgente = false;
    try { DB.sv(); } catch (e) {}
    return true;
  }

  function gerarPdfDoBot() {
    return new Promise(function (ok, erro) {
      var t = setTimeout(function () { window._botPdfHook = null; delete window._pdfPrazoData; erro(new Error('O PDF demorou demais para ficar pronto.')); }, PDF_TIMEOUT_MS);
      window._botPdfHook = function (blob, nome, q) { clearTimeout(t); ok({ blob: blob, nome: nome, q: q }); };
      gerarPDF();
    });
  }

  function avisarAceito(ped) {
    return api('/bot/pedidos/status', { method: 'POST', body: JSON.stringify({ id: ped.id, status: 'aceito' }) }).catch(function () {});
  }

  // Fase 'cotar': calcula só o VALOR (sem PDF, sem modal) e manda ao Worker, que pergunta o prazo ao dono no WhatsApp
  function cotar(ped) {
    avisarAceito(ped);
    var estado = guardarTela();
    var stone = acharPedra(ped.pedra);
    if (!stone) { restaurarTela(estado); return revisar(ped, 'Pedra "' + ped.pedra + '" não encontrada (ou ambígua) no catálogo do app.'); }
    var q, valor, agenda;
    try {
      q = montarQ(ped, stone);
      valor = ped.pagamento === 'parcelado' ? q.parc : q.vista;
      agenda = lastEnd();
    } catch (e) { restaurarTela(estado); return revisar(ped, e.message); }
    restaurarTela(estado);
    if (!(valor > 0)) return revisar(ped, 'O app calculou valor zero (confira as medidas e a pedra).');
    var corpo = { id: ped.id, valor: valor, avisos: ped._avisos || [], pagamento: ped.pagamento === 'parcelado' ? 'parcelado' : 'vista' };
    // Custo, lucro e margem calculados pelo app: o Worker mostra ao dono e avisa quando a margem fica baixa
    var custo = +q._custoPainel || 0;
    if (custo > 0 && valor > 0) {
      corpo.custo = Math.round(custo * 100) / 100;
      corpo.lucro = Math.round((valor - custo) * 100) / 100;
      corpo.margem_pct = Math.round((valor - custo) / valor * 1000) / 10;
    }
    // Soleira e peitoril não entram na agenda de produção: não envia agenda_ate (o Worker não mostra "agenda ocupada")
    return api('/bot/pedidos/cotacao', { method: 'POST', body: JSON.stringify(corpo) }).then(function (res) {
      if (res && (res.ok || res._http === 404)) cotados[ped.id] = true;
      else console.warn('[bot] cotação falhou:', res);
    }).catch(function () {});
  }

  function processar(ped) {
    avisarAceito(ped);
    var estado = guardarTela();
    var stone = acharPedra(ped.pedra);
    if (!stone) { restaurarTela(estado); return revisar(ped, 'Pedra "' + ped.pedra + '" não encontrada (ou ambígua) no catálogo do app.'); }
    var q;
    try { q = montarQ(ped, stone); }
    catch (e) { restaurarTela(estado); return revisar(ped, e.message); }
    if (ped.fase === 'gerar' || ped.origem === 'dono') definirPrazo(ped, q); // sem prazo definido, o modal abre como antes
    return gerarPdfDoBot()
      .then(function (r) {
        var ov = document.getElementById('pdfOv'); if (ov) ov.remove();
        return blobParaBase64(r.blob).then(function (b64) {
          var valor = ped.pagamento === 'parcelado' ? q.parc : q.vista;
          return api('/bot/pedidos/enviar', { method: 'POST', body: JSON.stringify({ id: ped.id, pdf: b64, arquivo: r.nome, valor: valor, avisos: ped._avisos || [], resumo: { pedra: stone.nm, itens: itensDe(ped).map(function (it) { return { ambiente: it.ambiente, acabamento: it.acabamento, pecas: it.pecas }; }) } }) });
        });
      })
      .then(function (res) {
        if (res && (res.ok || res._http === 410)) { feitos[ped.id] = true; if (res.ok) _orcMarcarPdf(q); } // 410 = janela de 24 h (Worker já avisou o dono)
        else if (res && res._http && res._http !== 409) console.warn('[bot] envio falhou:', res);
      })
      .catch(function (e) { delete window._pdfPrazoData; return revisar(ped, e.message || 'Falha ao gerar o PDF.'); })
      .then(function () { restaurarTela(estado); });
  }

  function ciclo() {
    if (busy || document.hidden || !base()) return;
    busy = true;
    api('/bot/pedidos').then(function (r) {
      var todos = (r.pedidos || []).map(normalizar).filter(function (p) { return !feitos[p.id] && !(p.fase === 'cotar' && cotados[p.id]); });
      // Pedido sem cor/pedra ou sem peças válidas nunca era processado e expirava calado: agora o dono é avisado pelo Worker
      todos.filter(function (p) { return !p.pedra || !itensDe(p).every(function (it) { return it.pecas && it.pecas.length && ACB[it.ambiente]; }); })
        .forEach(function (p) {
          revisar(p, !p.pedra ? 'O cliente ainda não informou a cor da pedra.' : 'Faltam medidas válidas ou o tipo (soleira/peitoril) do pedido.');
        });
      var fila = todos.filter(function (p) {
        return p.pedra && itensDe(p).every(function (it) { return it.pecas && it.pecas.length && ACB[it.ambiente]; });
      });
      var seq = Promise.resolve();
      fila.forEach(function (p) { seq = seq.then(function () { return p.fase === 'cotar' ? cotar(p) : processar(p); }); });
      return seq;
    }).catch(function () {}).then(function () { busy = false; });
  }

  window.botPedidosIniciar = function () { if (!window._botPedTimer) { window._botPedTimer = setInterval(ciclo, POLL_MS); ciclo(); } };
  window.botPedidosParar = function () { clearInterval(window._botPedTimer); window._botPedTimer = null; };
  window.botPedidosAgora = ciclo;
  window.addEventListener('load', function () { setTimeout(window.botPedidosIniciar, 3000); });
})();
