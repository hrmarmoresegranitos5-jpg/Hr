// ╔══════════════════════════════════════════════════════════════════╗
// ║          HR MÁRMORES — COMPRA PROGRAMADA HR   v1.1               ║
// ║          Módulo autocontido — não modifica arquivos existentes   ║
// ║                                                                    ║
// ║  Requer: hr-db-core.js carregado ANTES deste arquivo (usa         ║
// ║  HRdb.utils, HRdb.financeiro, HRdb.orcamentos, HRdb.clientes,     ║
// ║  HRdb.on/emit). Carregar depois de hr-db-core.js no index.html.   ║
// ║                                                                    ║
// ║  Nomenclatura: em toda a UI/contratos/recibos usar sempre          ║
// ║  "Compra Programada HR" — nunca "consórcio".                      ║
// ║                                                                    ║
// ║  Camadas do arquivo (nessa ordem, buscar pelos números dos        ║
// ║  comentários ══ N. ══ abaixo):                                    ║
// ║    1.   Persistência — _store() é a ÚNICA função que toca         ║
// ║         localStorage. Trocar por Firestore no futuro exige         ║
// ║         reescrever só _store() e nada mais neste arquivo.         ║
// ║    2-3. Regras de negócio — cálculo de %, status, pagamentos,      ║
// ║         reajustes, cancelamento. Não tocam no DOM.                ║
// ║    3b.  Backup / restauração / CSV.                               ║
// ║    4-7. UI — CSS, modais, painel, ações de tela. Só chamam as      ║
// ║         funções de negócio acima; nunca leem localStorage direto. ║
// ║    HRdb.compraProgramada (fim da seção 3b) é a API pública —       ║
// ║    console/testes podem chamar HRdb.compraProgramada.* sem UI.    ║
// ╚══════════════════════════════════════════════════════════════════╝

;(function(){
  'use strict';

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    if (typeof HRdb === 'undefined') {
      console.error('[CompraProgramada] HRdb não encontrado. Carregue hr-db-core.js antes de app-compra-programada.js.');
      return;
    }
    initCompraProgramada();
  });

  function initCompraProgramada(){

    // ══════════════════════════════════════════════════════════════
    // 1. CAMADA DE DADOS — mini-fábrica de módulos (mesmo padrão do
    //    HRdb, mas local, pois _makeModule é privado ao hr-db-core.js)
    // ══════════════════════════════════════════════════════════════

    function _store(nome, defaults){
      var KEY = 'hrdb_' + nome;
      function _load(){
        try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
        catch(e){ console.warn('[CP] Falha ao carregar ' + nome, e); return []; }
      }
      function _save(arr){
        try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; }
        catch(e){ console.error('[CP] Falha ao salvar ' + nome, e); return false; }
      }
      var data = _load();
      return {
        listar: function(filtro){
          var arr = HRdb.utils.clone(data);
          if (!filtro) return arr;
          if (typeof filtro === 'function') return arr.filter(filtro);
          return arr.filter(function(item){
            return Object.keys(filtro).every(function(k){ return item[k] === filtro[k]; });
          });
        },
        buscar: function(id){
          var item = data.find(function(x){ return x.id === id; });
          return item ? HRdb.utils.clone(item) : null;
        },
        criar: function(d){
          var agora = new Date().toISOString();
          var item = Object.assign({}, defaults || {}, d, {
            id: d.id || HRdb.utils.uid(nome.slice(0,3)),
            // preserva _criado original quando vier de um backup/import; senão usa agora
            _criado: d._criado || agora, _atualizado: agora
          });
          data.unshift(item);
          _save(data);
          HRdb.emit('cp:' + nome + ':criado', HRdb.utils.clone(item));
          return HRdb.utils.clone(item);
        },
        existe: function(id){ return data.some(function(x){ return x.id === id; }); },
        atualizar: function(id, patch){
          var idx = data.findIndex(function(x){ return x.id === id; });
          if (idx < 0) return null;
          Object.assign(data[idx], patch, { _atualizado: new Date().toISOString() });
          _save(data);
          HRdb.emit('cp:' + nome + ':atualizado', HRdb.utils.clone(data[idx]));
          return HRdb.utils.clone(data[idx]);
        },
        count: function(){ return data.length; }
      };
    }

    var comprasDB    = _store('cp_compras',    {
      numero:'', clienteId:'', clienteNome:'', clienteTel:'', projetoTitulo:'', orcamentoId:'',
      valorOriginal:0, valorAtual:0, valorParcela:0, qtdParcelasEstimada:0,
      diaVencimento:10, dataPrimeiroPagamento:'', percentualLiberacao:70, prazoFabricacaoDias:0,
      observacoes:'', situacao:'ativo', producao:null, canceladoInfo:null
    });
    var pagamentosDB = _store('cp_pagamentos', {
      compraId:'', valor:0, forma:'', data:'', obs:'', estornado:false, estornoInfo:null, financeiroTxId:'', numeroAmigavel:''
    });
    var reajustesDB  = _store('cp_reajustes',  {
      compraId:'', data:'', motivo:'', tipo:'', valorAnterior:0, valorNovo:0, usuario:''
    });
    var historicoDB  = _store('cp_historico',  {
      compraId:'', tipo:'status', de:'', para:'', detalhe:'', valor:0, usuario:'', data:''
    });

    function _configGet(){
      try { return Object.assign({ percentualPadrao: 70, acrescimoPadrao: 0 }, JSON.parse(localStorage.getItem('hrdb_cp_config')) || {}); }
      catch(e){ return { percentualPadrao: 70, acrescimoPadrao: 0 }; }
    }
    function _configSet(patch){
      var cfg = Object.assign(_configGet(), patch);
      localStorage.setItem('hrdb_cp_config', JSON.stringify(cfg));
      return cfg;
    }

    // ══════════════════════════════════════════════════════════════
    // 1b. IDENTIFICAÇÃO DE FUNCIONÁRIO (sessão) — item 1 do acabamento.
    //     NÃO é um sistema de login/autenticação completo: é só uma
    //     identificação de "quem está mexendo agora", guardada na sessão
    //     do navegador (sessionStorage — reseta ao fechar a aba/app).
    //     Usada para carimbar nome+data+hora em cada evento de auditoria
    //     (a auditoria em si já existia — só passamos a alimentar
    //     _usuarioAtual() com a escolha do funcionário em vez do texto
    //     fixo "Painel administrativo"). Trocar de usuário NUNCA altera
    //     eventos já gravados — cada evento antigo já guarda o nome de
    //     quem o registrou no momento em que ocorreu (_historico() abaixo
    //     já chamava _usuarioAtual() na hora da gravação).
    // ══════════════════════════════════════════════════════════════

    var SESSAO_USUARIO_KEY = 'hr_cp_usuario_sessao';
    var CADASTRO_FUNC_KEY  = 'hrdb_cp_funcionarios';

    function _funcionariosListar(){
      try {
        var arr = JSON.parse(localStorage.getItem(CADASTRO_FUNC_KEY));
        if (Array.isArray(arr) && arr.length) return arr;
      } catch(e){}
      return ['Hangel', 'Atendente', 'Fabrício']; // sugestão inicial — editável pelo usuário
    }
    function _funcionarioAdicionar(nome){
      nome = (nome || '').trim();
      if (!nome) return _funcionariosListar();
      var arr = _funcionariosListar();
      if (arr.indexOf(nome) < 0) { arr.push(nome); localStorage.setItem(CADASTRO_FUNC_KEY, JSON.stringify(arr)); }
      return arr;
    }
    function _sessaoUsuarioGet(){
      try { return sessionStorage.getItem(SESSAO_USUARIO_KEY) || ''; } catch(e){ return ''; }
    }
    function _sessaoUsuarioSet(nome){
      try { sessionStorage.setItem(SESSAO_USUARIO_KEY, nome); } catch(e){}
    }

    // ══════════════════════════════════════════════════════════════
    // 2. HELPERS DE DINHEIRO E DATA (centavos inteiros — evita erro
    //    de ponto flutuante, conforme exigido)
    // ══════════════════════════════════════════════════════════════

    function cent(v){ return Math.round((parseFloat(v) || 0) * 100); }
    function reais(c){ return (c || 0) / 100; }
    function fmtR(c){ return 'R$ ' + reais(c).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
    function hoje(){ return HRdb.utils.hoje(); }
    /** Identificação de quem executou a ação. Prioridade: (1) usuário
     *  escolhido nesta sessão da Compra Programada (seletor — ver 1b);
     *  (2) window.HR_USUARIO_ATUAL, caso algum outro módulo do app já
     *  defina isso; (3) "Painel administrativo" como último recurso. */
    function _usuarioAtual(){
      var daSessao = _sessaoUsuarioGet();
      if (daSessao) return daSessao;
      return (typeof window.HR_USUARIO_ATUAL === 'string' && window.HR_USUARIO_ATUAL) || 'Painel administrativo';
    }
    function dataBR(iso){
      if (!iso) return '—';
      var p = iso.split('-'); if (p.length !== 3) return iso;
      return p[2] + '/' + p[1] + '/' + p[0];
    }
    function addMeses(iso, n){
      var p = iso.split('-').map(Number);
      var d = new Date(p[0], p[1]-1 + n, p[2]);
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function diffDias(isoA, isoB){
      var a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    }

    // ══════════════════════════════════════════════════════════════
    // 3. REGRAS DE NEGÓCIO
    // ══════════════════════════════════════════════════════════════

    function _totalPago(compraId){
      return pagamentosDB.listar({compraId: compraId})
        .filter(function(p){ return !p.estornado; })
        .reduce(function(s,p){ return s + p.valor; }, 0);
    }

    function _percentual(compra, totalPago){
      if (!compra.valorAtual) return 0;
      return Math.min(999, (totalPago / compra.valorAtual) * 100);
    }

    function _statusFinanceiro(compra, totalPago){
      if (compra.situacao === 'cancelado') return 'cancelado';
      if (compra.valorAtual > 0 && totalPago >= compra.valorAtual) return 'quitado';
      if (_percentual(compra, totalPago) >= (compra.percentualLiberacao || 70)) return 'liberado';
      return 'em_pagamento';
    }

    /** Estimativa de próxima parcela — cronograma calculado, não persistido
     *  (pagamentos são livres em valor, então isso é só uma previsão). */
    function _proximaParcela(compra, totalPago){
      if (!compra.valorParcela || !compra.dataPrimeiroPagamento) return null;
      var parcelasPagas = Math.floor(totalPago / compra.valorParcela);
      if (compra.qtdParcelasEstimada && parcelasPagas >= compra.qtdParcelasEstimada) return null;
      if (compra.valorAtual > 0 && totalPago >= compra.valorAtual) return null;
      return { indice: parcelasPagas + 1, data: addMeses(compra.dataPrimeiroPagamento, parcelasPagas), valor: compra.valorParcela };
    }

    function _diasAtraso(compra, statusFin, proxima){
      if (statusFin === 'quitado' || statusFin === 'cancelado' || !proxima) return 0;
      var d = diffDias(proxima.data, hoje());
      return d > 0 ? d : 0;
    }

    function _historico(compraId, tipo, de, para, detalhe, valor){
      historicoDB.criar({
        compraId: compraId, tipo: tipo, de: de || '', para: para || '', detalhe: detalhe || '',
        valor: valor || 0, usuario: _usuarioAtual(), data: new Date().toISOString()
      });
    }

    function _resumo(compra){
      var totalPago = _totalPago(compra.id);
      var pct = _percentual(compra, totalPago);
      var statusFin = _statusFinanceiro(compra, totalPago);
      var proxima = _proximaParcela(compra, totalPago);
      var atrasoDias = _diasAtraso(compra, statusFin, proxima);
      var saldo = compra.valorAtual - totalPago;
      var saldoPosInstalacao = (compra.producao === 'instalado' && saldo > 0) ? saldo : 0;
      return {
        compra: compra, totalPago: totalPago, saldo: saldo,
        percentual: pct, statusFinanceiro: statusFin, atrasada: atrasoDias > 0,
        diasAtraso: atrasoDias, proximaParcela: proxima,
        faltaParaMeta: Math.max(0, Math.round(compra.valorAtual * ((compra.percentualLiberacao||70)/100)) - totalPago),
        saldoPosInstalacao: saldoPosInstalacao,
        alertaSaldoPosInstalacao: saldoPosInstalacao > 0
      };
    }

    /** Loga "parcela vencida" no histórico no máximo uma vez por parcela
     *  (evita spam toda vez que o painel é reaberto). Chamada só nos
     *  pontos de entrada do painel (abrir lista / abrir detalhe), não em
     *  todo recálculo de resumo. */
    function _checarParcelaVencida(compra, r){
      if (!r.atrasada || !r.proximaParcela) return;
      var marcador = 'parcela_' + r.proximaParcela.indice + '_vencida';
      if (compra._alertasLogados && compra._alertasLogados[marcador]) return;
      var logados = Object.assign({}, compra._alertasLogados || {});
      logados[marcador] = true;
      comprasDB.atualizar(compra.id, { _alertasLogados: logados });
      _historico(compra.id, 'alerta', '', '', 'Parcela nº ' + r.proximaParcela.indice + ' vencida em ' + dataBR(r.proximaParcela.data) + '.', r.proximaParcela.valor);
    }

    function _proximoNumero(){
      var ano = new Date().getFullYear();
      var prefixo = 'CP-' + ano + '-';
      var max = 0;
      comprasDB.listar().forEach(function(c){
        if (c.numero && c.numero.indexOf(prefixo) === 0) {
          var n = parseInt(c.numero.slice(prefixo.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      return prefixo + String(max + 1).padStart(4, '0');
    }

    /** Número amigável de pagamento (item 6) — só visual (ex: PG-2026-0001).
     *  O UUID interno (id) continua sendo a chave real; este número NUNCA
     *  é usado como identificador técnico em nenhum lugar do código. */
    function _proximoNumeroPagamento(){
      var ano = new Date().getFullYear();
      var prefixo = 'PG-' + ano + '-';
      var max = 0;
      pagamentosDB.listar().forEach(function(p){
        if (p.numeroAmigavel && p.numeroAmigavel.indexOf(prefixo) === 0) {
          var n = parseInt(p.numeroAmigavel.slice(prefixo.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      return prefixo + String(max + 1).padStart(4, '0');
    }

    function criarCompra(d){
      if (!d.clienteNome || !d.clienteNome.trim()) throw new Error('Nome do cliente é obrigatório.');
      if (!d.valorProjeto || cent(d.valorProjeto) <= 0) throw new Error('Valor do projeto é obrigatório.');
      var cfg = _configGet();
      var compra = comprasDB.criar({
        numero: _proximoNumero(),
        clienteId: d.clienteId || '', clienteNome: d.clienteNome.trim(), clienteTel: d.clienteTel || '',
        projetoTitulo: d.projetoTitulo || '', orcamentoId: d.orcamentoId || '',
        valorOriginal: cent(d.valorProjeto), valorAtual: cent(d.valorProjeto),
        valorParcela: cent(d.valorParcela || 0), qtdParcelasEstimada: parseInt(d.qtdParcelas || 0, 10),
        diaVencimento: parseInt(d.diaVencimento || 10, 10),
        dataPrimeiroPagamento: d.dataPrimeiroPagamento || hoje(),
        percentualLiberacao: d.percentualLiberacao != null ? parseFloat(d.percentualLiberacao) : cfg.percentualPadrao,
        prazoFabricacaoDias: parseInt(d.prazoFabricacaoDias || 0, 10),
        observacoes: d.observacoes || '', situacao: 'ativo', producao: null, canceladoInfo: null
      });
      _historico(compra.id, 'status', '—', 'ativo', 'Compra Programada criada — ' + compra.numero);
      return compra;
    }

    // Proteção contra clique duplo / envio duplicado: guarda a "assinatura"
    // (valor+data+forma) do último pagamento registrado por contrato e
    // rejeita uma repetição idêntica registrada em menos de 4 segundos.
    // Isso é defesa de 2ª camada — a defesa principal é desabilitar o
    // botão na UI (ver cpConfirmarPagamento).
    var _ultimosPagamentos = {};

    function registrarPagamento(compraId, valorReais, opts){
      opts = opts || {};
      var compra = comprasDB.buscar(compraId);
      if (!compra) throw new Error('Compra Programada não encontrada.');
      if (compra.situacao === 'cancelado') throw new Error('Este contrato está cancelado.');
      var valorC = cent(valorReais);
      if (valorC <= 0) throw new Error('Informe um valor de pagamento válido.');
      var data = opts.data || hoje();

      var assinatura = valorC + '|' + data + '|' + (opts.forma || '');
      var agora = Date.now();
      var ultimo = _ultimosPagamentos[compraId];
      if (ultimo && ultimo.assinatura === assinatura && (agora - ultimo.ts) < 4000) {
        throw new Error('Este mesmo pagamento (valor, data e forma) já foi registrado há poucos segundos. Se for intencional, aguarde alguns segundos e tente novamente.');
      }
      _ultimosPagamentos[compraId] = { assinatura: assinatura, ts: agora };

      var statusAntes = _statusFinanceiro(compra, _totalPago(compraId));
      var pagamento = pagamentosDB.criar({ compraId: compraId, valor: valorC, forma: opts.forma || '', data: data, obs: opts.obs || '', numeroAmigavel: _proximoNumeroPagamento() });

      // Proteção contra duplicidade na integração financeira: o id do
      // pagamento é sempre novo (uid), mas ainda assim confirmamos que
      // não existe nenhuma movimentação financeira já vinculada a ele
      // antes de criar uma nova — nunca lança duas vezes o mesmo pagamento.
      var jaLancado = HRdb.financeiro.listar(function(t){ return t.cpPagamentoId === pagamento.id; })[0];
      var fin = jaLancado || HRdb.financeiro.criar({
        type: 'in', categoria: 'venda', subcategoria: 'compra_programada',
        desc: 'Compra Programada ' + compra.numero + ' — ' + compra.clienteNome,
        value: reais(valorC), date: data, dataPagamento: data,
        clienteId: compra.clienteId, orcamentoId: compra.orcamentoId,
        formaPagamento: opts.forma || '', status: 'confirmado',
        observacoes: 'Origem: Compra Programada ' + compra.numero,
        origemCompraProgramadaId: compra.id, cpPagamentoId: pagamento.id
      });
      if (!jaLancado) pagamentosDB.atualizar(pagamento.id, { financeiroTxId: fin.id });

      var r = _resumo(comprasDB.buscar(compraId));
      _historico(compraId, 'pagamento', '', '', 'Pagamento registrado (' + (opts.forma || 'sem forma informada') + ')', valorC);
      if (r.statusFinanceiro === 'liberado' && statusAntes !== 'liberado') {
        _historico(compraId, 'status', statusAntes, 'liberado', 'Meta de ' + (compra.percentualLiberacao||70) + '% atingida — elegível para produção.');
      }
      if (r.statusFinanceiro === 'quitado' && statusAntes !== 'quitado') {
        _historico(compraId, 'status', statusAntes, 'quitado', 'Contrato quitado (100%).');
      }
      return pagamentosDB.buscar(pagamento.id);
    }

    function estornarPagamento(pagamentoId, motivo){
      var p = pagamentosDB.listar(function(x){ return x.id === pagamentoId; })[0];
      if (!p) throw new Error('Pagamento não encontrado.');
      if (p.estornado) throw new Error('Pagamento já estornado.');
      // Nunca editamos o valor do pagamento original — só marcamos como
      // estornado, preservando data original do pagamento + data/motivo/
      // usuário do estorno, e o vínculo com a movimentação financeira
      // original (financeiroTxId), para auditoria completa.
      pagamentosDB.atualizar(p.id, {
        estornado: true,
        estornoInfo: { data: hoje(), motivo: motivo || '', usuario: _usuarioAtual(), dataPagamentoOriginal: p.data }
      });
      if (p.financeiroTxId) {
        HRdb.financeiro.atualizar(p.financeiroTxId, { status: 'cancelado', observacoes: '[ESTORNADO em ' + hoje() + '] ' + (motivo || '') });
      }
      _historico(p.compraId, 'estorno', '', '', 'Pagamento de ' + dataBR(p.data) + ' estornado. Motivo: ' + (motivo || '—'), p.valor);
    }

    function aplicarReajuste(compraId, opts){
      // opts: { tipo:'percentual'|'valor_novo', valor, motivo }
      var compra = comprasDB.buscar(compraId);
      if (!compra) throw new Error('Compra Programada não encontrada.');
      var anterior = compra.valorAtual;
      var novo;
      if (opts.tipo === 'percentual') novo = Math.round(anterior * (1 + (parseFloat(opts.valor)||0)/100));
      else novo = cent(opts.valor);
      if (novo <= 0) throw new Error('Valor de reajuste inválido.');
      reajustesDB.criar({ compraId: compraId, data: hoje(), motivo: opts.motivo || '', tipo: opts.tipo, valorAnterior: anterior, valorNovo: novo, usuario: _usuarioAtual() });
      comprasDB.atualizar(compraId, { valorAtual: novo });
      _historico(compraId, 'reajuste', fmtR(anterior), fmtR(novo), 'Reajuste aplicado. Motivo: ' + (opts.motivo || '—'), novo - anterior);
    }

    function confirmarMedidas(compraId){
      var r = _resumo(comprasDB.buscar(compraId));
      if (r.statusFinanceiro !== 'liberado' && r.statusFinanceiro !== 'quitado') throw new Error('O contrato ainda não atingiu a meta financeira.');
      comprasDB.atualizar(compraId, { producao: 'medidas_confirmadas' });
      _historico(compraId, 'status', r.compra.producao, 'medidas_confirmadas', 'Medidas confirmadas pela equipe.');
    }

    function liberarProducao(compraId){
      var compra = comprasDB.buscar(compraId);
      if (compra.producao !== 'medidas_confirmadas') throw new Error('Confirme as medidas antes de liberar a produção.');
      comprasDB.atualizar(compraId, { producao: 'producao_liberada' });
      _historico(compraId, 'status', 'medidas_confirmadas', 'producao_liberada', 'Produção liberada manualmente por um administrador.');
    }

    var PRODUCAO_MSG = {
      producao_liberada: 'Produção liberada.',
      em_producao: 'Projeto entrou em produção.',
      pronto_instalacao: 'Projeto pronto para instalação.',
      instalacao_agendada: 'Instalação agendada.',
      instalado: 'Instalação realizada.'
    };
    function avancarProducao(compraId, novoStatus){
      var compra = comprasDB.buscar(compraId);
      comprasDB.atualizar(compraId, { producao: novoStatus });
      _historico(compraId, 'status', compra.producao, novoStatus, PRODUCAO_MSG[novoStatus] || 'Status de produção atualizado.');
      if (novoStatus === 'instalado') {
        var r = _resumo(comprasDB.buscar(compraId));
        if (r.saldo > 0) {
          _historico(compraId, 'alerta', '', '', '⚠️ Cliente com saldo após instalação: ' + fmtR(r.saldo), r.saldo);
        }
      }
    }

    /** Alteração manual de status de produção — item 3 (admin override).
     *  Pula as regras normais do fluxo sequencial. Só pode ser chamada
     *  com um motivo preenchido, e sempre grava um evento distinto
     *  ('status_manual') na auditoria, deixando claro que não foi o
     *  fluxo automático que mudou o status. */
    function alterarStatusManualProducao(compraId, novoStatus, motivo){
      var compra = comprasDB.buscar(compraId);
      if (!compra) throw new Error('Compra Programada não encontrada.');
      if (!motivo || !motivo.trim()) throw new Error('Informe o motivo da alteração manual.');
      var anterior = compra.producao;
      comprasDB.atualizar(compraId, { producao: novoStatus || null });
      _historico(compraId, 'status_manual', anterior || '—', novoStatus || '—',
        '⚠️ Status de produção alterado manualmente por um administrador. Motivo: ' + motivo.trim());
    }

    function cancelarContrato(compraId, opts){
      opts = opts || {};
      var compra = comprasDB.buscar(compraId);
      if (!compra) throw new Error('Compra Programada não encontrada.');
      var totalPago = _totalPago(compraId);
      comprasDB.atualizar(compraId, {
        situacao: 'cancelado',
        canceladoInfo: {
          data: hoje(), motivo: opts.motivo || '', valorPago: totalPago, saldo: compra.valorAtual - totalPago,
          valoresDevolvidos: cent(opts.valoresDevolvidos || 0), taxas: cent(opts.taxas || 0), obs: opts.obs || '',
          usuario: _usuarioAtual()
        }
      });
      _historico(compraId, 'status', compra.situacao, 'cancelado', 'Contrato cancelado. Motivo: ' + (opts.motivo || '—'), totalPago);
    }

    function simular(valorProjeto, valorParcela, percentualMeta){
      var vp = cent(valorProjeto), vpar = cent(valorParcela);
      var meta = Math.round(vp * ((percentualMeta||70)/100));
      var qtd = vpar > 0 ? Math.ceil(meta / vpar) : 0;
      return { meta: meta, qtdParcelas: qtd, saldoAposMeta: vp - meta };
    }

    function dashboard(){
      var ativos = comprasDB.listar({situacao:'ativo'});
      // Nomenclatura deliberadamente separada: "contratado" é o valor dos
      // contratos (compromisso), "recebido" é dinheiro que já entrou —
      // os dois nunca devem ser somados um ao outro.
      var out = {
        contratosAtivos: 0, valorTotalContratado: 0, totalRecebido: 0, saldoAReceber: 0,
        parcelasVencidas: 0, proximosDe70: 0, liberados: 0,
        saldoPosInstalacao: 0, contratosComSaldoPosInstalacao: 0,
        valorVencido: 0, qtdInadimplentes: 0, valorNecessarioLiberarAbaixoMeta: 0
      };
      ativos.forEach(function(c){
        var r = _resumo(c);
        out.contratosAtivos++;
        out.valorTotalContratado += c.valorAtual;
        out.totalRecebido += r.totalPago;
        out.saldoAReceber += Math.max(0, r.saldo);
        if (r.atrasada) {
          out.parcelasVencidas++;
          out.qtdInadimplentes++;
          out.valorVencido += r.proximaParcela ? r.proximaParcela.valor : 0;
        }
        if (r.percentual >= 50 && r.percentual < (c.percentualLiberacao||70)) out.proximosDe70++;
        if (r.statusFinanceiro === 'liberado' || r.statusFinanceiro === 'quitado') out.liberados++;
        if (r.statusFinanceiro !== 'liberado' && r.statusFinanceiro !== 'quitado') out.valorNecessarioLiberarAbaixoMeta += r.faltaParaMeta;
        if (r.alertaSaldoPosInstalacao) {
          out.saldoPosInstalacao += r.saldoPosInstalacao;
          out.contratosComSaldoPosInstalacao++;
        }
      });
      return out;
    }

    function listarComResumo(filtro){
      return comprasDB.listar(filtro).map(_resumo);
    }

    // ══════════════════════════════════════════════════════════════
    // 3b. BACKUP / RESTAURAÇÃO / RELATÓRIO CSV
    // ══════════════════════════════════════════════════════════════

    function exportarBackup(){
      var compras = comprasDB.listar();
      var pagamentos = pagamentosDB.listar();
      var reajustes = reajustesDB.listar();
      var historico = historicoDB.listar();
      var cancelamentos = compras.filter(function(c){ return c.canceladoInfo; }).map(function(c){
        return Object.assign({ compraId: c.id, numero: c.numero }, c.canceladoInfo);
      });
      // "Parcelas" não são persistidas (pagamentos são livres em valor) —
      // aqui vai um snapshot informativo do cronograma estimado de cada
      // contrato, calculado no momento da exportação.
      var parcelas = [];
      compras.forEach(function(c){
        if (c.valorParcela > 0 && c.dataPrimeiroPagamento && c.qtdParcelasEstimada) {
          for (var i = 0; i < c.qtdParcelasEstimada; i++) {
            parcelas.push({ compraId: c.id, numero: c.numero, indice: i + 1, data: addMeses(c.dataPrimeiroPagamento, i), valor: c.valorParcela });
          }
        }
      });
      return {
        _backup: true, modulo: 'compra-programada-hr', versao: 1, geradoEm: new Date().toISOString(),
        contratos: compras, pagamentos: pagamentos, parcelas: parcelas, reajustes: reajustes,
        cancelamentos: cancelamentos, historicoStatus: historico.filter(function(h){ return h.tipo === 'status'; }),
        auditoria: historico
      };
    }

    function validarBackup(payload){
      if (!payload || typeof payload !== 'object') return { ok:false, erro:'Arquivo vazio ou ilegível.' };
      if (payload.modulo !== 'compra-programada-hr') return { ok:false, erro:'Este arquivo não é um backup da Compra Programada HR.' };
      if (!Array.isArray(payload.contratos)) return { ok:false, erro:'Backup sem a lista de contratos — arquivo corrompido ou incompleto.' };
      return { ok:true };
    }

    /** Mescla um backup nos dados atuais — NUNCA substitui nada
     *  automaticamente; só adiciona registros cujo ID ainda não existe. */
    function mesclarBackup(payload){
      function mesclar(store, arr){
        var adicionados = 0;
        (arr || []).forEach(function(item){
          if (item && item.id && !store.existe(item.id)) { store.criar(item); adicionados++; }
        });
        return adicionados;
      }
      return {
        contratos: mesclar(comprasDB, payload.contratos),
        pagamentos: mesclar(pagamentosDB, payload.pagamentos),
        reajustes: mesclar(reajustesDB, payload.reajustes),
        historico: mesclar(historicoDB, payload.auditoria || payload.historicoStatus)
      };
    }

    function gerarCSV(){
      var linhas = [['Cliente','Contrato','Valor','Pago','Saldo','Percentual','Status','ProximoVencimento']];
      listarComResumo().forEach(function(r){
        linhas.push([
          r.compra.clienteNome, r.compra.numero, reais(r.compra.valorAtual).toFixed(2), reais(r.totalPago).toFixed(2),
          reais(Math.max(0, r.saldo)).toFixed(2), r.percentual.toFixed(1) + '%',
          r.statusFinanceiro, r.proximaParcela ? dataBR(r.proximaParcela.data) : '—'
        ]);
      });
      return linhas.map(function(l){
        return l.map(function(v){ v = String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }).join(';');
      }).join('\n');
    }

    // Expõe módulo completo em HRdb (não sobrescreve nada existente)
    HRdb.compraProgramada = {
      db: { compras: comprasDB, pagamentos: pagamentosDB, reajustes: reajustesDB, historico: historicoDB },
      cent: cent, reais: reais, fmtR: fmtR, dataBR: dataBR,
      config: { get: _configGet, set: _configSet },
      resumo: _resumo, criarCompra: criarCompra, registrarPagamento: registrarPagamento,
      estornarPagamento: estornarPagamento, aplicarReajuste: aplicarReajuste,
      confirmarMedidas: confirmarMedidas, liberarProducao: liberarProducao, avancarProducao: avancarProducao,
      alterarStatusManualProducao: alterarStatusManualProducao,
      cancelarContrato: cancelarContrato, simular: simular, dashboard: dashboard, listarComResumo: listarComResumo,
      exportarBackup: exportarBackup, validarBackup: validarBackup, mesclarBackup: mesclarBackup, gerarCSV: gerarCSV,
      usuarioAtual: _usuarioAtual, funcionariosListar: _funcionariosListar
    };


    // ══════════════════════════════════════════════════════════════
    // 4. UI — CSS isolado (injetado via JS, não toca em styles.css)
    // ══════════════════════════════════════════════════════════════

    var css = document.createElement('style');
    css.textContent =
      '.cp-cards{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch;}' +
      '.cp-card{flex:0 0 auto;min-width:118px;background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;}' +
      '.cp-card b{display:block;font-size:1.05rem;font-weight:800;color:var(--gold2);margin-top:2px;}' +
      '.cp-card span{font-size:.62rem;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;}' +
      '.cp-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;}' +
      '.cp-chip{flex:0 0 auto;padding:6px 12px;border-radius:20px;border:1px solid var(--bd);background:var(--s2);color:var(--t2);font-size:.68rem;font-weight:600;cursor:pointer;white-space:nowrap;}' +
      '.cp-chip.on{background:var(--gold);color:#1a1305;border-color:var(--gold);}' +
      '.cp-row{padding:11px 4px;border-bottom:1px solid var(--bd);cursor:pointer;}' +
      '.cp-row-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}' +
      '.cp-row-nome{font-size:.85rem;font-weight:700;color:var(--tx);}' +
      '.cp-row-num{font-size:.62rem;color:var(--t3);}' +
      '.cp-bar-wrap{background:var(--s3);border-radius:6px;height:7px;margin:6px 0 4px;overflow:hidden;position:relative;}' +
      '.cp-bar{height:100%;background:linear-gradient(90deg,var(--gold3),var(--gold2));border-radius:6px;}' +
      '.cp-bar-meta{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--tx);opacity:.5;}' +
      '.cp-row-sub{display:flex;justify-content:space-between;font-size:.68rem;color:var(--t3);}' +
      '.cp-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.6rem;font-weight:700;}' +
      '.cp-badge-amarelo{background:rgba(232,201,106,.15);color:var(--gold2);}' +
      '.cp-badge-verde{background:rgba(58,158,106,.18);color:var(--grn);}' +
      '.cp-badge-vermelho{background:rgba(201,68,68,.18);color:var(--red);}' +
      '.cp-badge-azul{background:rgba(74,128,181,.18);color:var(--blu);}' +
      '.cp-fab{position:fixed;right:16px;bottom:86px;z-index:410;background:var(--gold);color:#1a1305;border:none;border-radius:50px;padding:13px 18px;font-weight:700;font-size:.78rem;box-shadow:0 6px 18px rgba(0,0,0,.5);cursor:pointer;}' +
      '.cp-pay-list{max-height:220px;overflow-y:auto;border:1px solid var(--bd);border-radius:10px;}' +
      '.cp-pay-item{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid var(--bd);font-size:.75rem;}' +
      '.cp-pay-item:last-child{border-bottom:none;}' +
      '.cp-hist-item{padding:7px 0;border-bottom:1px solid var(--bd);font-size:.7rem;color:var(--t2);}' +
      '.cp-hist-item small{color:var(--t4);}' +
      '.cp-client-hero{text-align:center;padding:22px 16px;}' +
      '.cp-client-big{font-size:2rem;font-weight:800;color:var(--gold2);font-family:"Cormorant Garamond",serif;}' +
      '.cp-empty{text-align:center;padding:30px 16px;color:var(--t3);font-size:.78rem;}' +
      /* item 9 — responsividade: badges e linhas de ação nunca estouram a tela */
      '.cp-row-top{flex-wrap:wrap;}' +
      '#cpAdminMd .modal, #cpDetalheMd .modal, #cpNovoMd .modal, #cpUsuarioMd .modal, #cpPromptMd .modal, #cpSelectMd .modal, #cpEstornoMd .modal, #cpConfigMd .modal, #cpImportConfirmMd .modal{width:92vw;box-sizing:border-box;}' +
      '.cp-opt-btn{width:100%;text-align:left;white-space:normal;word-break:break-word;}' +
      '.cp-pay-item{flex-wrap:wrap;gap:4px;}' +
      '@media (max-width:400px){ .cp-cards{gap:6px;} .cp-card{min-width:104px;padding:8px 10px;} }';
    document.head.appendChild(css);

    // ── overlays (mesmo padrão .ov/.modal do resto do app) ──
    var overlaysHtml =
      '<div class="ov" id="cpAdminMd"><div class="modal" style="max-width:480px;max-height:88vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">📦 Compra Programada HR <span style="float:right;font-size:.62rem;color:var(--t3);cursor:pointer;" onclick="cpAbrirConfig()">⚙️</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;">' +
          '<span style="font-size:.66rem;color:var(--t3);">Usuário: <b id="cpUsuarioAtualLabel" style="color:var(--gold2);">—</b></span>' +
          '<span style="font-size:.62rem;color:var(--t3);text-decoration:underline;cursor:pointer;" onclick="cpTrocarUsuario()">Trocar usuário</span>' +
        '</div>' +
        '<div id="cpUltimoBackup" style="font-size:.64rem;color:var(--t3);margin-bottom:8px;"></div>' +
        '<div class="cp-cards" id="cpCards"></div>' +
        '<div class="cp-chips" id="cpChips"></div>' +
        '<div id="cpLista"></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;">' +
          '<button class="btn btn-g" style="flex:1;" onclick="cpAbrirNovo()">+ Nova Compra Programada</button>' +
          '<button class="btn btn-o" style="flex:0 0 auto;padding:12px 14px;" onclick="cpAbrirSimulador()">🧮</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:8px;">' +
          '<button class="btn btn-o" style="flex:1;font-size:.68rem;" onclick="cpExportarBackup()">⬇ Backup JSON</button>' +
          '<button class="btn btn-o" style="flex:1;font-size:.68rem;" onclick="cpImportarBackup()">⬆ Importar</button>' +
          '<button class="btn btn-o" style="flex:1;font-size:.68rem;" onclick="cpExportarCSV()">📄 CSV</button>' +
        '</div>' +
        '<input type="file" id="cpImportInput" accept="application/json,.json" style="display:none;">' +
        '<button class="btn btn-o" style="margin-top:8px;" data-close>Fechar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpConfirmMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div id="cpConfirmConteudo"></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;">' +
          '<button class="btn btn-g" style="flex:1;" onclick="cpExecutarConfirmacao()">Sim, confirmar</button>' +
          '<button class="btn btn-o" style="flex:1;" data-close>Cancelar</button>' +
        '</div>' +
      '</div></div>' +

      '<div class="ov" id="cpNovoMd"><div class="modal" style="max-width:460px;max-height:88vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">Nova Compra Programada</div>' +
        '<div class="f"><label>A partir de orçamento aprovado (opcional)</label><select id="cpNovoOrc" onchange="cpNovoPreencherDeOrcamento()"><option value="">— Preencher manualmente —</option></select></div>' +
        '<div class="f"><label>Cliente</label><input id="cpNovoCliente" type="text" placeholder="Nome do cliente"></div>' +
        '<div class="f"><label>Telefone / WhatsApp</label><input id="cpNovoTel" type="tel" placeholder="(74) 9xxxx-xxxx"></div>' +
        '<div class="f"><label>Projeto</label><input id="cpNovoProjeto" type="text" placeholder="Ex: Cozinha — Preto São Gabriel"></div>' +
        '<div class="r2"><div class="f"><label>Valor do projeto (R$)</label><input id="cpNovoValor" type="number" step="0.01"></div><div class="f"><label>Valor da parcela (R$)</label><input id="cpNovoParcela" type="number" step="0.01"></div></div>' +
        '<div class="r2"><div class="f"><label>Qtd. parcelas (estimada)</label><input id="cpNovoQtd" type="number"></div><div class="f"><label>Dia de vencimento</label><input id="cpNovoDiaVenc" type="number" min="1" max="28" value="10"></div></div>' +
        '<div class="r2"><div class="f"><label>Data 1º pagamento</label><input id="cpNovoData1" type="date"></div><div class="f"><label>% p/ liberar produção</label><input id="cpNovoPct" type="number" step="0.1"></div></div>' +
        '<div class="f"><label>Prazo estimado de fabricação (dias)</label><input id="cpNovoPrazo" type="number"></div>' +
        '<div class="f"><label>Observações</label><textarea id="cpNovoObs" rows="2"></textarea></div>' +
        '<button class="btn btn-g" onclick="cpSalvarNovo()" style="margin-bottom:7px;">Criar Compra Programada</button>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpDetalheMd"><div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div id="cpDetalheConteudo"></div>' +
        '<button class="btn btn-o" data-close style="margin-top:10px;">Fechar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpPagamentoMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">💰 Registrar Pagamento</div>' +
        '<input type="hidden" id="cpPagCompraId">' +
        '<div class="f"><label>Valor recebido (R$)</label><input id="cpPagValor" type="number" step="0.01" autofocus></div>' +
        '<div class="f"><label>Forma de pagamento</label><select id="cpPagForma"><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option></select></div>' +
        '<div class="f"><label>Data</label><input id="cpPagData" type="date"></div>' +
        '<div class="f"><label>Observação (opcional)</label><input id="cpPagObs" type="text"></div>' +
        '<button class="btn btn-g" id="cpPagBtnConfirmar" onclick="cpConfirmarPagamento()" style="margin-bottom:7px;">Registrar</button>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpReajusteMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">📈 Aplicar Reajuste</div>' +
        '<input type="hidden" id="cpReajCompraId">' +
        '<div class="f"><label>Tipo</label><select id="cpReajTipo"><option value="percentual">Reajuste percentual (%)</option><option value="valor_novo">Definir novo valor total (R$)</option></select></div>' +
        '<div class="f"><label>Valor</label><input id="cpReajValor" type="number" step="0.01"></div>' +
        '<div class="f"><label>Motivo</label><input id="cpReajMotivo" type="text" placeholder="Ex: correção anual de preço da pedra"></div>' +
        '<button class="btn btn-g" onclick="cpConfirmarReajuste()" style="margin-bottom:7px;">Aplicar</button>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpCancelarMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">🚫 Cancelar Contrato</div>' +
        '<input type="hidden" id="cpCancCompraId">' +
        '<div class="f"><label>Motivo</label><textarea id="cpCancMotivo" rows="2"></textarea></div>' +
        '<div class="r2"><div class="f"><label>Valor devolvido (R$)</label><input id="cpCancDevolvido" type="number" step="0.01" value="0"></div><div class="f"><label>Taxas retidas (R$)</label><input id="cpCancTaxas" type="number" step="0.01" value="0"></div></div>' +
        '<div class="f"><label>Observações</label><input id="cpCancObs" type="text"></div>' +
        '<button class="btn btn-g" style="background:var(--red);margin-bottom:7px;" onclick="cpConfirmarCancelamento()">Confirmar Cancelamento</button>' +
        '<button class="btn btn-o" data-close>Voltar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpSimMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">🧮 Simulador — Compra Programada</div>' +
        '<div class="f"><label>Valor do projeto (R$)</label><input id="cpSimValor" type="number" step="0.01" oninput="cpAtualizarSimulador()"></div>' +
        '<div class="f"><label>Parcela desejada (R$)</label><input id="cpSimParcela" type="number" step="0.01" oninput="cpAtualizarSimulador()"></div>' +
        '<div class="f"><label>% para liberar produção</label><input id="cpSimPct" type="number" step="0.1" value="70" oninput="cpAtualizarSimulador()"></div>' +
        '<div id="cpSimResultado" style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px;font-size:.78rem;color:var(--t2);margin:10px 0;"></div>' +
        '<div style="font-size:.62rem;color:var(--t4);margin-bottom:10px;">A previsão depende dos pagamentos serem feitos nas datas combinadas e de eventuais reajustes contratuais.</div>' +
        '<button class="btn btn-o" data-close>Fechar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpClienteMd"><div class="modal" style="max-width:420px;max-height:90vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div id="cpClienteConteudo"></div>' +
        '<button class="btn btn-o" data-close style="margin-top:10px;">Fechar</button>' +
      '</div></div>' +

      // ── item 2: modais reutilizáveis que substituem prompt()/confirm() nativos ──

      '<div class="ov" id="cpConfigMd"><div class="modal" style="max-width:440px;max-height:88vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">⚙️ Configurações — Compra Programada</div>' +
        '<div class="f"><label>Percentual padrão para liberar produção (%)</label><input id="cpCfgPct" type="number" step="0.1"></div>' +
        '<div class="f"><label>Acréscimo padrão ao importar de orçamento (%)</label><input id="cpCfgAcrescimo" type="number" step="0.1" placeholder="Ex: 10"><small style="display:block;color:var(--t3);font-size:.64rem;margin-top:4px;">Aplicado por cima do valor parcelado do orçamento, pra cobrir o tempo mais longo da Compra Programada (reajuste de material/mão de obra até lá). 0 = usa o valor parcelado sem acréscimo.</small></div>' +
        '<div class="f"><label>Texto jurídico do contrato (opcional)</label><textarea id="cpCfgTextoJuridico" rows="6" placeholder="Cole aqui o texto de cláusulas revisado por um advogado. Se deixar em branco, o contrato usa só o texto explicativo padrão (não-jurídico)."></textarea></div>' +
        '<button class="btn btn-g" onclick="cpSalvarConfig()" style="margin-bottom:7px;">Salvar</button>' +
        '<button class="btn btn-o" data-close>Fechar</button>' +
      '</div></div>' +

      '<div class="ov" id="cpUsuarioMd"><div class="modal" style="max-width:380px;max-height:85vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">👤 Quem está usando o sistema?</div>' +
        '<div style="font-size:.68rem;color:var(--t3);margin-bottom:10px;">Isso identifica quem registrou cada ação no histórico — não é uma senha.</div>' +
        '<div id="cpUsuarioOpcoes" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>' +
        '<button class="btn btn-o" onclick="cpUsuarioNovo()">+ Cadastrar novo funcionário</button>' +
      '</div></div>' +

      // Substitui window.prompt(): entrada de texto ou texto longo (textarea), com validação de obrigatório.
      '<div class="ov" id="cpPromptMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle" id="cpPromptTitulo"></div>' +
        '<div id="cpPromptContexto" style="font-size:.75rem;color:var(--t2);margin-bottom:10px;"></div>' +
        '<div class="f"><label id="cpPromptLabel"></label>' +
          '<input id="cpPromptInput" type="text">' +
          '<textarea id="cpPromptTextarea" rows="3" style="display:none;"></textarea>' +
        '</div>' +
        '<div id="cpPromptErro" style="color:var(--red);font-size:.68rem;min-height:16px;"></div>' +
        '<button class="btn btn-g" onclick="cpConfirmarPrompt()" style="margin-bottom:7px;">Confirmar</button>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      // Substitui window.prompt() com lista numerada: seleção de opção por botão.
      '<div class="ov" id="cpSelectMd"><div class="modal" style="max-width:400px;max-height:85vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
        '<div class="mtitle" id="cpSelectTitulo"></div>' +
        '<div id="cpSelectContexto" style="font-size:.75rem;color:var(--t2);margin-bottom:10px;"></div>' +
        '<div id="cpSelectOpcoes" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;"></div>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      // Substitui prompt() do motivo de estorno — campo obrigatório, com contexto do pagamento (padrão do exemplo pedido).
      '<div class="ov" id="cpEstornoMd"><div class="modal" style="max-width:400px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">🔴 Estornar Pagamento</div>' +
        '<input type="hidden" id="cpEstornoPagId">' +
        '<div class="r2"><div class="f"><label>Pagamento</label><span id="cpEstornoValor">—</span></div><div class="f"><label>Data</label><span id="cpEstornoData">—</span></div></div>' +
        '<div class="r2"><div class="f"><label>Cliente</label><span id="cpEstornoCliente">—</span></div><div class="f"><label>Contrato</label><span id="cpEstornoContrato">—</span></div></div>' +
        '<div class="f"><label>Motivo do estorno *</label><textarea id="cpEstornoMotivo" rows="3" placeholder="Campo obrigatório"></textarea></div>' +
        '<div id="cpEstornoErro" style="color:var(--red);font-size:.68rem;min-height:16px;"></div>' +
        '<button class="btn btn-g" style="background:var(--red);margin-bottom:7px;" onclick="cpConfirmarEstorno()">Confirmar estorno</button>' +
        '<button class="btn btn-o" data-close>Cancelar</button>' +
      '</div></div>' +

      // Substitui confirm() da importação de backup.
      '<div class="ov" id="cpImportConfirmMd"><div class="modal" style="max-width:420px;" onclick="event.stopPropagation()">' +
        '<div class="mtitle">📥 Confirmar Importação</div>' +
        '<div id="cpImportConfirmConteudo" style="font-size:.78rem;color:var(--t2);margin-bottom:12px;"></div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-g" style="flex:1;" onclick="cpConfirmarImportacao()">Importar</button>' +
          '<button class="btn btn-o" style="flex:1;" data-close>Cancelar</button>' +
        '</div>' +
      '</div></div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = overlaysHtml;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    // ══════════════════════════════════════════════════════════════
    // Navegação de modais em pilha (correção do risco relatado: cancelar
    // um subdiálogo aninhado nunca mais deixa a tela sem nenhum modal).
    //
    //   _abrir(id)   → abre id; se havia um modal aberto antes, empilha-o.
    //   _voltar()    → fecha o modal atual e reabre o anterior da pilha
    //                  (usado em TODO cancelamento/fechamento — outside
    //                  click e botões [data-close]). Pilha vazia = fecha
    //                  tudo (revela a tela de baixo do app — nunca "papel
    //                  em branco" dentro do próprio módulo).
    //   _irPara(id)  → usado em conclusões bem-sucedidas de fluxo (ex:
    //                  pagamento registrado, reajuste aplicado): limpa a
    //                  pilha e abre id direto, sem deixar telas
    //                  intermediárias descartadas presas na pilha.
    //   _fechar(id)  → fecha só aquele modal, sem mexer na pilha (uso
    //                  restrito a onde nada mais deve abrir/reabrir).
    // ══════════════════════════════════════════════════════════════
    var _modalStack = [];
    var _modalAtual = null;
    function _abrir(id){
      if (_modalAtual && _modalAtual !== id) _modalStack.push(_modalAtual);
      document.querySelectorAll('.ov').forEach(function(o){ o.classList.remove('on'); });
      document.getElementById(id).classList.add('on');
      _modalAtual = id;
    }
    function _voltar(){
      document.querySelectorAll('.ov').forEach(function(o){ o.classList.remove('on'); });
      var anterior = _modalStack.pop();
      if (anterior) { document.getElementById(anterior).classList.add('on'); _modalAtual = anterior; }
      else { _modalAtual = null; }
    }
    function _irPara(id){
      _modalStack = [];
      _modalAtual = null;
      _abrir(id);
    }
    /** Fecha toda a cadeia de subdiálogos atual e volta direto para `id`
     *  (usado nas conclusões bem-sucedidas de fluxo: pagamento registrado,
     *  reajuste aplicado, status alterado, backup importado...). Se `id`
     *  estiver na pilha, desempilha só até ele — preserva o que havia por
     *  baixo (ex.: o painel administrativo por baixo do detalhe). Se não
     *  estiver (ex.: primeiro acesso, nada empilhado ainda), abre `id`
     *  direto com pilha limpa. */
    function _voltarAte(id){
      while (_modalStack.length && _modalStack[_modalStack.length - 1] !== id) {
        _modalStack.pop();
      }
      if (_modalStack.length) { _voltar(); }
      else if (document.getElementById(id)) { _irPara(id); }
    }
    function _fechar(id){
      var el = document.getElementById(id);
      if (el) el.classList.remove('on');
      if (_modalAtual === id) _modalAtual = null;
    }

    // fecha ao clicar fora + botões data-close (mesmo padrão do resto do app) —
    // agora sempre via _voltar(): cancelar QUALQUER subdiálogo, por mais
    // aninhado que esteja, volta pra tela anterior em vez de sumir tudo.
    document.querySelectorAll('#cpAdminMd, #cpNovoMd, #cpDetalheMd, #cpPagamentoMd, #cpReajusteMd, #cpCancelarMd, #cpSimMd, #cpClienteMd, #cpConfirmMd, #cpConfigMd, #cpUsuarioMd, #cpPromptMd, #cpSelectMd, #cpEstornoMd, #cpImportConfirmMd').forEach(function(ov){
      ov.addEventListener('click', function(){ _limparPendentes(ov.id); _voltar(); });
      ov.querySelectorAll('[data-close]').forEach(function(btn){
        btn.addEventListener('click', function(){ _limparPendentes(ov.id); _voltar(); });
      });
    });
    function _limparPendentes(id){
      if (id === 'cpConfirmMd') _confirmPendente = null;
      if (id === 'cpPromptMd') _promptPendente = null;
      if (id === 'cpSelectMd') _selectPendente = null;
      if (id === 'cpImportConfirmMd') _importConfirmPendente = null;
    }

    document.getElementById('cpImportInput').addEventListener('change', function(e){
      if (e.target.files && e.target.files[0]) _cpProcessarArquivoImport(e.target.files[0]);
    });


    // ── Confirmação genérica para ações críticas (item 7) ──
    var _confirmPendente = null;
    function _abrirConfirmacao(titulo, pergunta, compra, r, onConfirm){
      _confirmPendente = onConfirm;
      var h = '<div class="mtitle">⚠️ ' + titulo + '</div>';
      h += '<div style="font-size:.8rem;color:var(--t2);margin-bottom:12px;">' + pergunta + '</div>';
      h += '<div class="f"><label>Cliente</label><span>' + compra.clienteNome + '</span></div>';
      h += '<div class="f"><label>Contrato</label><span>' + compra.numero + '</span></div>';
      h += '<div class="r2"><div class="f"><label>Valor total</label><span>' + fmtR(compra.valorAtual) + '</span></div><div class="f"><label>Recebido</label><span>' + fmtR(r.totalPago) + '</span></div></div>';
      h += '<div class="r2"><div class="f"><label>Saldo</label><span>' + fmtR(Math.max(0,r.saldo)) + '</span></div><div class="f"><label>% pago</label><span>' + r.percentual.toFixed(1) + '%</span></div></div>';
      document.getElementById('cpConfirmConteudo').innerHTML = h;
      _abrir('cpConfirmMd');
    }
    window.cpExecutarConfirmacao = function(){
      var fn = _confirmPendente;
      _confirmPendente = null;
      _fechar('cpConfirmMd');
      if (fn) fn();
      // Conclusão bem-sucedida: sempre volta para o detalhe (se havia um em
      // contexto), pulando qualquer formulário intermediário já descartado
      // (reajuste, cancelamento, motivo de status manual etc.) — por isso
      // usa _voltarAte() e não _voltar() (que só recuaria um nível).
      if (_detalheAtualId) _voltarAte('cpDetalheMd');
    };

    // ── Prompt genérico (substitui window.prompt) — item 2 ──
    var _promptPendente = null;
    var _promptOpts = null;
    function _abrirPrompt(opts){
      // opts: {titulo, contexto(html opcional), label, placeholder, valorInicial, tipo, obrigatorio, textarea(bool), onConfirm(valor)}
      _promptOpts = opts;
      _promptPendente = opts.onConfirm;
      document.getElementById('cpPromptTitulo').textContent = opts.titulo || '';
      document.getElementById('cpPromptContexto').innerHTML = opts.contexto || '';
      document.getElementById('cpPromptLabel').textContent = opts.label || '';
      var inp = document.getElementById('cpPromptInput'), ta = document.getElementById('cpPromptTextarea');
      if (opts.textarea) {
        inp.style.display = 'none'; ta.style.display = '';
        ta.value = opts.valorInicial || ''; ta.placeholder = opts.placeholder || '';
      } else {
        ta.style.display = 'none'; inp.style.display = '';
        inp.value = opts.valorInicial != null ? opts.valorInicial : ''; inp.placeholder = opts.placeholder || '';
        inp.type = opts.tipo || 'text';
      }
      document.getElementById('cpPromptErro').textContent = '';
      _abrir('cpPromptMd');
    }
    window.cpConfirmarPrompt = function(){
      var opts = _promptOpts;
      var el = opts.textarea ? document.getElementById('cpPromptTextarea') : document.getElementById('cpPromptInput');
      var valor = el.value;
      if (opts.obrigatorio && !String(valor).trim()) {
        document.getElementById('cpPromptErro').textContent = 'Este campo é obrigatório.';
        return;
      }
      var fn = _promptPendente; _promptPendente = null;
      if (fn) fn(valor);
    };

    // ── Seleção de opção genérica (substitui window.prompt com lista numerada) — item 2 ──
    var _selectPendente = null;
    function _abrirSelect(opts){
      // opts: {titulo, contexto(html opcional), opcoes:[{valor,label}], onEscolher(valor)}
      _selectPendente = opts.onEscolher;
      document.getElementById('cpSelectTitulo').textContent = opts.titulo || '';
      document.getElementById('cpSelectContexto').innerHTML = opts.contexto || '';
      var el = document.getElementById('cpSelectOpcoes');
      el.innerHTML = opts.opcoes.map(function(o, i){
        return '<button type="button" class="btn btn-o cp-opt-btn" data-idx="' + i + '">' + o.label + '</button>';
      }).join('');
      el.querySelectorAll('button[data-idx]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var i = parseInt(btn.getAttribute('data-idx'), 10);
          var fn = _selectPendente; _selectPendente = null;
          if (fn) fn(opts.opcoes[i].valor);
        });
      });
      _abrir('cpSelectMd');
    }

    // ── Backup / restauração / CSV (item 1) ──
    window.cpExportarBackup = function(){
      var payload = exportarBackup();
      var blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'compra-programada-backup-' + hoje() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      localStorage.setItem('hrdb_cp_ultimo_backup', new Date().toISOString());
      _renderUltimoBackup();
    };
    window.cpExportarCSV = function(){
      var csv = gerarCSV();
      var blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'compra-programada-relatorio-' + hoje() + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    };
    window.cpImportarBackup = function(){
      document.getElementById('cpImportInput').value = '';
      document.getElementById('cpImportInput').click();
    };
    var _importConfirmPendente = null;
    function _cpProcessarArquivoImport(file){
      var reader = new FileReader();
      reader.onload = function(){
        var payload;
        try { payload = JSON.parse(reader.result); }
        catch(e){ alert('Arquivo inválido: não é um JSON legível.'); return; }
        var val = validarBackup(payload);
        if (!val.ok) { alert('Não foi possível importar: ' + val.erro); return; }
        var resumo = 'Foram encontrados <b>' + payload.contratos.length + '</b> contrato(s), <b>' +
          (payload.pagamentos||[]).length + '</b> pagamento(s) e <b>' + (payload.auditoria||[]).length + '</b> evento(s) de histórico neste backup.' +
          '<br><br>A importação <b>MESCLA</b> com os dados atuais: nada existente é apagado ou substituído — só são adicionados os registros cujo ID ainda não existe aqui.';
        document.getElementById('cpImportConfirmConteudo').innerHTML = resumo;
        _importConfirmPendente = function(){
          var resultado = mesclarBackup(payload);
          alert('Importação concluída.\nAdicionados: ' + resultado.contratos + ' contrato(s), ' + resultado.pagamentos + ' pagamento(s), ' + resultado.reajustes + ' reajuste(s), ' + resultado.historico + ' evento(s) de histórico.');
          _renderCards(); _renderLista();
        };
        _abrir('cpImportConfirmMd');
      };
      reader.readAsText(file);
    }
    window.cpConfirmarImportacao = function(){
      var fn = _importConfirmPendente; _importConfirmPendente = null;
      _fechar('cpImportConfirmMd');
      if (fn) fn();
      _voltarAte('cpAdminMd'); // o modal de importação sempre parte do painel
    };


    // ══════════════════════════════════════════════════════════════
    // 5. BADGES / RÓTULOS
    // ══════════════════════════════════════════════════════════════

    var PRODUCAO_LABEL = {
      null: null, medidas_confirmadas: 'Medidas confirmadas', producao_liberada: 'Liberado p/ produção',
      em_producao: 'Em produção', pronto_instalacao: 'Pronto p/ instalação',
      instalacao_agendada: 'Instalação agendada', instalado: 'Instalado'
    };

    // item 3 — fluxo de produção explícito: 70% atingido → Confirmar medidas →
    // Liberar produção → Em produção → Pronto p/ instalação → Agendar
    // instalação → Instalado. Cada tela mostra só o botão do PRÓXIMO passo.
    var PRODUCAO_SEQ = ['medidas_confirmadas','producao_liberada','em_producao','pronto_instalacao','instalacao_agendada','instalado'];
    var PRODUCAO_ACAO_LABEL = {
      medidas_confirmadas: 'Confirmar Medidas',
      producao_liberada: 'Liberar para Produção',
      em_producao: 'Iniciar Produção',
      pronto_instalacao: 'Marcar Pronto p/ Instalação',
      instalacao_agendada: 'Agendar Instalação',
      instalado: 'Marcar como Instalado'
    };
    /** Devolve o próximo passo válido do fluxo, ou null se não houver
     *  ação disponível agora (ainda não atingiu a meta, ou já instalado). */
    function _proximoPassoProducao(compra, r){
      if (!compra.producao) {
        if (r.statusFinanceiro === 'liberado' || r.statusFinanceiro === 'quitado') return 'medidas_confirmadas';
        return null;
      }
      var idx = PRODUCAO_SEQ.indexOf(compra.producao);
      if (idx < 0 || idx === PRODUCAO_SEQ.length - 1) return null;
      return PRODUCAO_SEQ[idx + 1];
    }

    function badgeFinanceiro(r){
      if (r.statusFinanceiro === 'cancelado') return '<span class="cp-badge cp-badge-vermelho">CANCELADO</span>';
      if (r.statusFinanceiro === 'quitado') return '<span class="cp-badge cp-badge-verde">✅ QUITADO</span>';
      if (r.statusFinanceiro === 'liberado') return '<span class="cp-badge cp-badge-verde">🟢 LIBERADO P/ PRODUÇÃO</span>';
      return '<span class="cp-badge cp-badge-amarelo">🟡 EM PAGAMENTO</span>';
    }
    function badgeAtraso(r){
      return r.atrasada ? ' <span class="cp-badge cp-badge-vermelho">' + r.diasAtraso + 'd atraso</span>' : '';
    }
    function badgeProducao(r){
      var lbl = PRODUCAO_LABEL[r.compra.producao];
      return lbl ? ' <span class="cp-badge cp-badge-azul">' + lbl + '</span>' : '';
    }
    function badgeSaldoPosInstalacao(r){
      return r.alertaSaldoPosInstalacao ? ' <span class="cp-badge cp-badge-vermelho">SALDO PÓS-INSTALAÇÃO</span>' : '';
    }

    // ══════════════════════════════════════════════════════════════
    // 6. PAINEL ADMINISTRATIVO
    // ══════════════════════════════════════════════════════════════

    var _filtroAtual = 'todos';

    window.cpAbrirPainel = function(){
      if (!_sessaoUsuarioGet()) { _abrirSeletorUsuario(function(){ cpAbrirPainel(); }); return; }
      _filtroAtual = 'todos';
      _renderCards();
      _renderChips();
      _renderLista();
      _renderUltimoBackup();
      var lbl = document.getElementById('cpUsuarioAtualLabel');
      if (lbl) lbl.textContent = _usuarioAtual();
      _irPara('cpAdminMd');
    };
    function _renderUltimoBackup(){
      var el = document.getElementById('cpUltimoBackup');
      if (!el) return;
      var iso = localStorage.getItem('hrdb_cp_ultimo_backup');
      if (!iso) { el.innerHTML = '⚠️ <b style="color:var(--red);">Nenhum backup feito ainda.</b> Recomendado gerar um regularmente.'; return; }
      var d = new Date(iso);
      var dias = Math.floor((Date.now() - d.getTime()) / 86400000);
      var txt = 'Último backup: ' + d.toLocaleString('pt-BR');
      el.innerHTML = dias >= 7
        ? txt + ' — <b style="color:var(--red);">⚠ Backup recomendado (há ' + dias + ' dia' + (dias===1?'':'s') + ')</b>'
        : txt;
    }

    function _renderCards(){
      var d = dashboard();
      var el = document.getElementById('cpCards');
      // "Contratado" (compromisso) e "Recebido" (dinheiro em caixa) ficam
      // deliberadamente separados — nunca somados um ao outro.
      el.innerHTML =
        _card('Contratos ativos', d.contratosAtivos) +
        _card('Total contratado', fmtR(d.valorTotalContratado)) +
        _card('Total recebido', fmtR(d.totalRecebido)) +
        _card('Saldo a receber', fmtR(d.saldoAReceber)) +
        _card('P/ liberar (<meta)', fmtR(d.valorNecessarioLiberarAbaixoMeta)) +
        _card('Liberados p/ produção', d.liberados) +
        _card('Valor vencido', fmtR(d.valorVencido), d.valorVencido>0) +
        _card('Inadimplentes', d.qtdInadimplentes, d.qtdInadimplentes>0) +
        _card('Saldo pós-instalação', fmtR(d.saldoPosInstalacao), d.saldoPosInstalacao>0);
    }
    function _card(titulo, valor, alerta){
      return '<div class="cp-card"' + (alerta ? ' style="border-color:var(--red);"' : '') + '><span>' + titulo + '</span><b' + (alerta?' style="color:var(--red);"':'') + '>' + valor + '</b></div>';
    }

    var CHIPS = [
      {k:'todos', l:'Todos'}, {k:'em_pagamento', l:'Em pagamento'}, {k:'atrasados', l:'Atrasados'},
      {k:'50', l:'50%+'}, {k:'70', l:'70%+'}, {k:'liberado', l:'Liberados'},
      {k:'producao', l:'Em produção'}, {k:'instalados_saldo', l:'Instalados c/ saldo'},
      {k:'quitado', l:'Quitados'}, {k:'cancelado', l:'Cancelados'}
    ];
    function _renderChips(){
      var el = document.getElementById('cpChips');
      el.innerHTML = CHIPS.map(function(c){
        return '<div class="cp-chip' + (c.k===_filtroAtual?' on':'') + '" onclick="cpFiltrar(\'' + c.k + '\')">' + c.l + '</div>';
      }).join('');
    }
    window.cpFiltrar = function(k){ _filtroAtual = k; _renderChips(); _renderLista(); };

    function _renderLista(){
      var el = document.getElementById('cpLista');
      var todos = listarComResumo();
      todos.forEach(function(r){ _checarParcelaVencida(r.compra, r); });
      var vis = todos.filter(function(r){
        switch(_filtroAtual){
          case 'todos': return true;
          case 'em_pagamento': return r.statusFinanceiro === 'em_pagamento';
          case 'atrasados': return r.atrasada;
          case '50': return r.percentual >= 50;
          case '70': return r.percentual >= 70;
          case 'liberado': return r.statusFinanceiro === 'liberado';
          case 'producao': return !!r.compra.producao;
          case 'instalados_saldo': return r.alertaSaldoPosInstalacao;
          case 'quitado': return r.statusFinanceiro === 'quitado';
          case 'cancelado': return r.statusFinanceiro === 'cancelado';
          default: return true;
        }
      });
      if (!vis.length){ el.innerHTML = '<div class="cp-empty">Nenhuma Compra Programada nesse filtro.</div>'; return; }
      el.innerHTML = vis.map(function(r){
        var metaPct = Math.min(100, (r.compra.percentualLiberacao||70));
        var barPct = Math.min(100, r.percentual);
        return '<div class="cp-row" onclick="cpAbrirDetalhe(\'' + r.compra.id + '\')">' +
          '<div class="cp-row-top"><span class="cp-row-nome">' + r.compra.clienteNome + '</span><span class="cp-row-num">' + r.compra.numero + '</span></div>' +
          '<div style="font-size:.68rem;color:var(--t3);">' + (r.compra.projetoTitulo || 'Projeto sem título') + '</div>' +
          '<div class="cp-bar-wrap"><div class="cp-bar" style="width:' + barPct + '%;"></div><div class="cp-bar-meta" style="left:' + metaPct + '%;"></div></div>' +
          '<div class="cp-row-sub"><span>' + fmtR(r.totalPago) + ' pago (' + r.percentual.toFixed(1) + '%)</span><span>Saldo ' + fmtR(Math.max(0,r.saldo)) + '</span></div>' +
          '<div style="margin-top:5px;">' + badgeFinanceiro(r) + badgeAtraso(r) + badgeProducao(r) + badgeSaldoPosInstalacao(r) + '</div>' +
        '</div>';
      }).join('');
    }

    window.cpAbrirConfig = function(){
      var cfg = _configGet();
      document.getElementById('cpCfgPct').value = cfg.percentualPadrao;
      document.getElementById('cpCfgAcrescimo').value = cfg.acrescimoPadrao || 0;
      document.getElementById('cpCfgTextoJuridico').value = cfg.textoJuridico || '';
      _abrir('cpConfigMd');
    };
    window.cpSalvarConfig = function(){
      var n = parseFloat(String(document.getElementById('cpCfgPct').value).replace(',','.'));
      if (isNaN(n) || n <= 0 || n > 100) { alert('Percentual inválido.'); return; }
      var nAcr = parseFloat(String(document.getElementById('cpCfgAcrescimo').value).replace(',','.'));
      if (isNaN(nAcr) || nAcr < 0) { alert('Acréscimo inválido.'); return; }
      _configSet({ percentualPadrao: n, acrescimoPadrao: nAcr, textoJuridico: document.getElementById('cpCfgTextoJuridico').value || '' });
      _voltarAte('cpAdminMd');
      alert('Configurações salvas. O percentual novo vale para novas Compras Programadas; contratos já criados mantêm o percentual definido na criação.');
    };

    // ── Seletor de usuário (item 1) ──
    var _usuarioCallbackPendente = null;
    function _abrirSeletorUsuario(callback){
      var el = document.getElementById('cpUsuarioOpcoes');
      var opcoes = ['Administrador'].concat(_funcionariosListar());
      el.innerHTML = opcoes.map(function(nome, i){
        return '<button type="button" class="btn btn-o cp-opt-btn" data-nome="' + i + '">' + (nome === 'Administrador' ? '🔑 ' : '👤 ') + nome + '</button>';
      }).join('');
      el.querySelectorAll('button[data-nome]').forEach(function(btn, i){
        btn.addEventListener('click', function(){ cpUsuarioEscolher(opcoes[i]); });
      });
      _usuarioCallbackPendente = callback;
      _abrir('cpUsuarioMd');
    }
    window.cpUsuarioEscolher = function(nome){
      _sessaoUsuarioSet(nome);
      var fn = _usuarioCallbackPendente; _usuarioCallbackPendente = null;
      if (fn) fn();
      _voltarAte('cpAdminMd'); // idempotente — se fn() já reabriu o painel (1ª vez), preserva o alvo com o resto da pilha
    };
    window.cpUsuarioNovo = function(){
      _abrirPrompt({
        titulo: 'Novo Funcionário',
        label: 'Nome do funcionário',
        obrigatorio: true,
        onConfirm: function(nome){
          nome = nome.trim();
          _funcionarioAdicionar(nome);
          _sessaoUsuarioSet(nome);
          var fn = _usuarioCallbackPendente; _usuarioCallbackPendente = null;
          if (fn) fn();
          _voltarAte('cpAdminMd');
        }
      });
    };
    window.cpTrocarUsuario = function(){
      _abrirSeletorUsuario(function(){
        var lbl = document.getElementById('cpUsuarioAtualLabel');
        if (lbl) lbl.textContent = _usuarioAtual();
      });
    };

    // ── Nova Compra Programada ──

    window.cpAbrirNovo = function(){
      var sel = document.getElementById('cpNovoOrc');
      var aprovados = (HRdb.orcamentos ? HRdb.orcamentos.listar({status:'aprovado'}) : []);
      sel.innerHTML = '<option value="">— Preencher manualmente —</option>' + aprovados.map(function(o){
        var val = o.parc || o.vista || 0; // valor parcelado é o padrão pra Compra Programada (cobre o custo real de vender fiado)
        return '<option value="' + o.id + '">' + (o.cli||'Sem nome') + ' — ' + (o.tipo||'Projeto') + ' — ' + fmtR(cent(val)) + '</option>';
      }).join('');
      ['cpNovoCliente','cpNovoTel','cpNovoProjeto','cpNovoValor','cpNovoParcela','cpNovoQtd','cpNovoObs'].forEach(function(id){ document.getElementById(id).value=''; });
      document.getElementById('cpNovoDiaVenc').value = 10;
      document.getElementById('cpNovoData1').value = hoje();
      document.getElementById('cpNovoPct').value = _configGet().percentualPadrao;
      document.getElementById('cpNovoPrazo').value = '';
      _cpParcelaDirty = false; // reabrir o modal sempre restaura o preenchimento automático da parcela
      _abrir('cpNovoMd');
    };

    // item pedido: "valor da parcela" preenchido sozinho a partir de
    // "valor do projeto" ÷ "qtd. parcelas" — só para de recalcular se o
    // usuário digitar um valor manualmente no próprio campo da parcela
    // (mesmo padrão de "campo sujo" já usado em outros lugares do app,
    // ex.: valor sugerido no modal de Confirmar Aceite).
    var _cpParcelaDirty = false;
    function _cpRecalcParcela(){
      if (_cpParcelaDirty) return;
      var valor = parseFloat(String(document.getElementById('cpNovoValor').value).replace(',','.')) || 0;
      var qtd = parseInt(document.getElementById('cpNovoQtd').value, 10) || 0;
      if (valor > 0 && qtd > 0) {
        document.getElementById('cpNovoParcela').value = (valor / qtd).toFixed(2);
      }
    }
    document.getElementById('cpNovoValor').addEventListener('input', _cpRecalcParcela);
    document.getElementById('cpNovoQtd').addEventListener('input', _cpRecalcParcela);
    document.getElementById('cpNovoParcela').addEventListener('input', function(){ _cpParcelaDirty = true; });

    window.cpNovoPreencherDeOrcamento = function(){
      var id = document.getElementById('cpNovoOrc').value;
      if (!id || !HRdb.orcamentos) return;
      var o = HRdb.orcamentos.buscar(id);
      if (!o) return;
      document.getElementById('cpNovoCliente').value = o.cli || '';
      document.getElementById('cpNovoTel').value = o.tel || '';
      document.getElementById('cpNovoProjeto').value = o.tipo || '';
      // item pedido: valor do projeto = valor PARCELADO do orçamento (não
      // à vista) + o acréscimo configurado em ⚙️ (cobre o tempo mais longo
      // da Compra Programada — reajuste de material/mão de obra até lá).
      var base = o.parc || o.vista || 0;
      var acrescimo = _configGet().acrescimoPadrao || 0;
      var valorFinal = base * (1 + acrescimo / 100);
      document.getElementById('cpNovoValor').value = valorFinal ? valorFinal.toFixed(2) : '';
      _cpParcelaDirty = false; // troca de orçamento sempre reativa o cálculo automático da parcela
      _cpRecalcParcela();
    };

    window.cpSalvarNovo = function(){
      try {
        var orcId = document.getElementById('cpNovoOrc').value;
        var orc = orcId && HRdb.orcamentos ? HRdb.orcamentos.buscar(orcId) : null;
        var compra = criarCompra({
          clienteId: orc && orc.clienteId ? orc.clienteId : '',
          clienteNome: document.getElementById('cpNovoCliente').value,
          clienteTel: document.getElementById('cpNovoTel').value,
          projetoTitulo: document.getElementById('cpNovoProjeto').value,
          orcamentoId: orcId || '',
          valorProjeto: document.getElementById('cpNovoValor').value,
          valorParcela: document.getElementById('cpNovoParcela').value,
          qtdParcelas: document.getElementById('cpNovoQtd').value,
          diaVencimento: document.getElementById('cpNovoDiaVenc').value,
          dataPrimeiroPagamento: document.getElementById('cpNovoData1').value,
          percentualLiberacao: document.getElementById('cpNovoPct').value,
          prazoFabricacaoDias: document.getElementById('cpNovoPrazo').value,
          observacoes: document.getElementById('cpNovoObs').value
        });
        _fechar('cpNovoMd');
        _renderCards(); _renderLista();
        cpAbrirDetalhe(compra.id);
      } catch(e){ alert(e.message); }
    };

    // ── Detalhe / ações ──

    var _detalheAtualId = null;

    window.cpAbrirDetalhe = function(id){
      _detalheAtualId = id;
      _renderDetalhe(id);
      _abrir('cpDetalheMd');
    };

    function _renderDetalhe(id){
      var compra = comprasDB.buscar(id);
      if (!compra) return;
      var r = _resumo(compra);
      _checarParcelaVencida(compra, r);
      var metaPct = Math.min(100, compra.percentualLiberacao||70);
      var barPct = Math.min(100, r.percentual);

      var pagamentos = pagamentosDB.listar({compraId:id}).sort(function(a,b){ return a.data < b.data ? 1 : -1; });
      var historico = historicoDB.listar({compraId:id}).sort(function(a,b){ return a.data < b.data ? 1 : -1; });

      var h = '<div class="mtitle">' + compra.numero + ' — ' + compra.clienteNome + '</div>';
      h += '<div style="font-size:.75rem;color:var(--t3);margin-bottom:8px;">' + (compra.projetoTitulo || 'Projeto sem título') + '</div>';
      h += '<div style="margin-bottom:8px;">' + badgeFinanceiro(r) + badgeAtraso(r) + badgeProducao(r) + badgeSaldoPosInstalacao(r) + '</div>';
      if (r.alertaSaldoPosInstalacao) {
        h += '<div style="background:rgba(201,68,68,.12);border:1px solid var(--red);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:.76rem;color:#ff9a9a;font-weight:700;">' +
          '🔴 CLIENTE COM SALDO APÓS INSTALAÇÃO — ' + fmtR(r.saldo) + ' pendente.' +
        '</div>';
      }
      h += '<div class="cp-bar-wrap" style="height:10px;"><div class="cp-bar" style="width:' + barPct + '%;"></div><div class="cp-bar-meta" style="left:' + metaPct + '%;"></div></div>';
      h += '<div class="cp-row-sub" style="margin-bottom:10px;"><span>' + r.percentual.toFixed(1) + '% pago</span><span>Meta: ' + metaPct + '%</span></div>';

      h += '<div class="r2">' +
             '<div class="f"><label>Valor atualizado</label><span>' + fmtR(compra.valorAtual) + '</span></div>' +
             '<div class="f"><label>Total pago</label><span>' + fmtR(r.totalPago) + '</span></div>' +
           '</div>';
      h += '<div class="r2">' +
             '<div class="f"><label>Saldo devedor</label><span>' + fmtR(Math.max(0,r.saldo)) + '</span></div>' +
             '<div class="f"><label>Falta p/ meta</label><span>' + (r.faltaParaMeta>0?fmtR(r.faltaParaMeta):'atingida ✓') + '</span></div>' +
           '</div>';
      if (r.proximaParcela) {
        h += '<div class="f"><label>Próxima parcela (estimativa)</label><span>' + fmtR(r.proximaParcela.valor) + ' — vence ' + dataBR(r.proximaParcela.data) + '</span></div>';
      }

      // Pagamentos
      h += '<div style="font-size:.72rem;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;">Pagamentos</div>';
      h += '<div class="cp-pay-list">';
      if (!pagamentos.length) h += '<div class="cp-pay-item">Nenhum pagamento registrado ainda.</div>';
      pagamentos.forEach(function(p){
        var numExibicao = p.numeroAmigavel || '—';
        h += '<div class="cp-pay-item"><span>' + numExibicao + ' · ' + dataBR(p.data) + ' · ' + (p.forma||'—') + (p.estornado?' <b style="color:var(--red);">(estornado)</b>':'') + '</span>' +
             '<span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + fmtR(p.valor) +
             (p.estornado ? '' : ' <a href="#" style="color:var(--t3);font-size:.68rem;" onclick="event.preventDefault();cpEstornar(\'' + p.id + '\')">estornar</a>' +
               ' <a href="#" style="color:var(--gold2);font-size:.68rem;" onclick="event.preventDefault();cpGerarRecibo(\'' + p.id + '\')">whatsapp</a>' +
               ' <a href="#" style="color:var(--gold2);font-size:.68rem;" onclick="event.preventDefault();cpGerarReciboPDF(\'' + p.id + '\')">PDF</a>' +
               ' <a href="#" style="color:var(--gold2);font-size:.68rem;" onclick="event.preventDefault();cpCompartilharRecibo(\'' + p.id + '\')">compartilhar</a>') +
             '</span></div>';
      });
      h += '</div>';

      // Ações
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">';
      if (compra.situacao !== 'cancelado') {
        var proximoPasso = _proximoPassoProducao(compra, r);
        h += '<button class="btn btn-g" style="flex:1 1 100%;" onclick="cpAbrirPagamento(\'' + id + '\')">+ Registrar Pagamento</button>';
        if (proximoPasso) {
          h += '<button class="btn btn-o" style="flex:1 1 100%;" onclick="cpFazerProximoPasso(\'' + id + '\')">' + PRODUCAO_ACAO_LABEL[proximoPasso] + '</button>';
        }
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpGerarContrato(\'' + id + '\')">📄 Gerar Contrato</button>';
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpCompartilharContrato(\'' + id + '\')">🔗 Compartilhar Contrato</button>';
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpAbrirReajuste(\'' + id + '\')">Aplicar Reajuste</button>';
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpVerTelaCliente(\'' + id + '\')">👁 Tela do Cliente</button>';
        h += '<button class="btn btn-o" style="flex:1;color:var(--red);" onclick="cpAbrirCancelar(\'' + id + '\')">Cancelar Contrato</button>';
        h += '<button class="btn btn-o" style="flex:1 1 100%;font-size:.66rem;color:var(--t3);" onclick="cpAbrirStatusManual(\'' + id + '\')">🔧 Alterar status de produção manualmente (admin)</button>';
      } else {
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpVerTelaCliente(\'' + id + '\')">👁 Tela do Cliente</button>';
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpGerarContrato(\'' + id + '\')">📄 Gerar Contrato</button>';
        h += '<button class="btn btn-o" style="flex:1;" onclick="cpCompartilharContrato(\'' + id + '\')">🔗 Compartilhar Contrato</button>';
        h += '<div class="f" style="flex:1 1 100%;"><label>Cancelado em ' + dataBR(compra.canceladoInfo.data) + '</label><span>Motivo: ' + (compra.canceladoInfo.motivo||'—') + '</span></div>';
      }
      h += '</div>';

      // Histórico / Auditoria
      h += '<div style="font-size:.72rem;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Histórico</div>';
      if (!historico.length) h += '<div class="cp-hist-item">Nenhum evento registrado ainda.</div>';
      historico.forEach(function(ev){
        h += '<div class="cp-hist-item">' + ev.detalhe + (ev.valor ? ' <b style="color:var(--gold2);">(' + fmtR(ev.valor) + ')</b>' : '') +
          '<br><small>' + new Date(ev.data).toLocaleString('pt-BR') + (ev.usuario ? ' · ' + ev.usuario : '') + '</small></div>';
      });

      document.getElementById('cpDetalheConteudo').innerHTML = h;
    }

    window.cpFazerConfirmarMedidas = function(id){ try{ confirmarMedidas(id); _renderDetalhe(id); _renderLista(); }catch(e){ alert(e.message); } };

    window.cpFazerLiberarProducao = function(id){
      var compra = comprasDB.buscar(id), r = _resumo(compra);
      _abrirConfirmacao('Liberar para Produção', 'Tem certeza que deseja liberar este projeto para produção?', compra, r, function(){
        try { liberarProducao(id); _renderDetalhe(id); _renderLista(); _renderCards(); } catch(e){ alert(e.message); }
      });
    };

    // item 3 — botão único de "próximo passo": nunca deixa pular etapa,
    // sempre mostra só a ação do passo seguinte na sequência do fluxo.
    window.cpFazerProximoPasso = function(id){
      var compra = comprasDB.buscar(id);
      var r = _resumo(compra);
      var proximo = _proximoPassoProducao(compra, r);
      if (!proximo) return;
      if (proximo === 'medidas_confirmadas') { window.cpFazerConfirmarMedidas(id); return; }
      if (proximo === 'producao_liberada') { window.cpFazerLiberarProducao(id); return; }
      var acaoLabel = PRODUCAO_ACAO_LABEL[proximo];
      var pergunta = proximo === 'instalado'
        ? 'Confirma que a instalação foi concluída? Se ainda houver saldo devedor, o sistema vai sinalizar automaticamente.'
        : 'Confirma: ' + acaoLabel + '?';
      _abrirConfirmacao(acaoLabel, pergunta, compra, r, function(){
        avancarProducao(id, proximo);
        _renderDetalhe(id); _renderLista(); _renderCards();
      });
    };

    // item 3 — override do administrador: exige motivo + confirmação, e
    // fica registrado na auditoria como alteração manual (tipo distinto).
    window.cpAbrirStatusManual = function(id){
      var compra = comprasDB.buscar(id);
      var opcoesStatus = [
        {valor:'', label:'— Nenhum (aguardando meta financeira) —'},
        {valor:'medidas_confirmadas', label:'Medidas confirmadas'},
        {valor:'producao_liberada', label:'Liberado p/ produção'},
        {valor:'em_producao', label:'Em produção'},
        {valor:'pronto_instalacao', label:'Pronto p/ instalação'},
        {valor:'instalacao_agendada', label:'Instalação agendada'},
        {valor:'instalado', label:'Instalado'}
      ];
      _abrirSelect({
        titulo: '🔧 Alterar Status Manualmente',
        contexto: 'Contrato ' + compra.numero + ' — ' + compra.clienteNome + '<br><small style="color:var(--t4);">Uso restrito ao administrador. Pula as regras normais do fluxo — exige motivo e fica registrado na auditoria.</small>',
        opcoes: opcoesStatus,
        onEscolher: function(novoStatus){
          _abrirPrompt({
            titulo: 'Motivo da alteração manual',
            label: 'Explique por que está alterando o status manualmente',
            obrigatorio: true,
            textarea: true,
            onConfirm: function(motivo){
              var r = _resumo(compra);
              var rotulo = (opcoesStatus.filter(function(o){ return o.valor === novoStatus; })[0] || {}).label || '—';
              _abrirConfirmacao('Confirmar Alteração Manual', 'Confirma a alteração manual de status para "' + rotulo + '"?', compra, r, function(){
                try {
                  alterarStatusManualProducao(id, novoStatus || null, motivo);
                  _renderDetalhe(id); _renderLista(); _renderCards();
                } catch(e){ alert(e.message); }
              });
            }
          });
        }
      });
    };

    window.cpEstornar = function(pagamentoId){
      var p = pagamentosDB.listar(function(x){ return x.id === pagamentoId; })[0];
      if (!p) return;
      var compra = comprasDB.buscar(p.compraId);
      document.getElementById('cpEstornoPagId').value = pagamentoId;
      document.getElementById('cpEstornoValor').textContent = fmtR(p.valor);
      document.getElementById('cpEstornoData').textContent = dataBR(p.data);
      document.getElementById('cpEstornoCliente').textContent = compra ? compra.clienteNome : '—';
      document.getElementById('cpEstornoContrato').textContent = compra ? compra.numero : '—';
      document.getElementById('cpEstornoMotivo').value = '';
      document.getElementById('cpEstornoErro').textContent = '';
      _abrir('cpEstornoMd');
    };
    window.cpConfirmarEstorno = function(){
      var pagamentoId = document.getElementById('cpEstornoPagId').value;
      var motivo = document.getElementById('cpEstornoMotivo').value;
      if (!motivo || !motivo.trim()) { document.getElementById('cpEstornoErro').textContent = 'Informe o motivo do estorno.'; return; }
      try {
        estornarPagamento(pagamentoId, motivo.trim());
        _renderDetalhe(_detalheAtualId); _renderCards(); _renderLista();
        if (_detalheAtualId) _voltarAte('cpDetalheMd'); else _voltar();
      } catch(e){ alert(e.message); }
    };

    // ── Registrar pagamento ──
    window.cpAbrirPagamento = function(id){
      document.getElementById('cpPagCompraId').value = id;
      document.getElementById('cpPagValor').value = '';
      document.getElementById('cpPagObs').value = '';
      document.getElementById('cpPagData').value = hoje();
      _abrir('cpPagamentoMd');
    };
    window.cpConfirmarPagamento = function(){
      var btn = document.getElementById('cpPagBtnConfirmar');
      if (btn && btn.disabled) return; // já em andamento — ignora clique repetido
      var id = document.getElementById('cpPagCompraId').value;
      if (btn) { btn.disabled = true; btn.textContent = 'Registrando...'; }
      try {
        registrarPagamento(id, document.getElementById('cpPagValor').value, {
          forma: document.getElementById('cpPagForma').value,
          data: document.getElementById('cpPagData').value,
          obs: document.getElementById('cpPagObs').value
        });
        _renderDetalhe(id); _renderCards(); _renderLista();
        _voltarAte('cpDetalheMd'); // reabre o detalhe (já atualizado), pulando o modal de pagamento
      } catch(e){ alert(e.message); }
      finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Registrar'; }
      }
    };

    // ── Reajuste ──
    window.cpAbrirReajuste = function(id){
      document.getElementById('cpReajCompraId').value = id;
      document.getElementById('cpReajValor').value = '';
      document.getElementById('cpReajMotivo').value = '';
      _abrir('cpReajusteMd');
    };
    window.cpConfirmarReajuste = function(){
      var id = document.getElementById('cpReajCompraId').value;
      var tipo = document.getElementById('cpReajTipo').value;
      var valorInput = document.getElementById('cpReajValor').value;
      var motivo = document.getElementById('cpReajMotivo').value;
      var compra = comprasDB.buscar(id);
      if (!compra) return;
      var anterior = compra.valorAtual;
      var novo = tipo === 'percentual' ? Math.round(anterior * (1 + (parseFloat(valorInput)||0)/100)) : cent(valorInput);
      if (!novo || novo <= 0) { alert('Valor de reajuste inválido.'); return; }
      _fechar('cpReajusteMd');
      var r = _resumo(compra);
      _abrirConfirmacao('Aplicar Reajuste', 'Confirma o reajuste de ' + fmtR(anterior) + ' para ' + fmtR(novo) + '?', compra, r, function(){
        try {
          aplicarReajuste(id, { tipo: tipo, valor: valorInput, motivo: motivo });
          _renderDetalhe(id); _renderCards(); _renderLista();
        } catch(e){ alert(e.message); }
      });
    };

    // ── Cancelamento ──
    window.cpAbrirCancelar = function(id){
      document.getElementById('cpCancCompraId').value = id;
      document.getElementById('cpCancMotivo').value = '';
      document.getElementById('cpCancDevolvido').value = 0;
      document.getElementById('cpCancTaxas').value = 0;
      document.getElementById('cpCancObs').value = '';
      _abrir('cpCancelarMd');
    };
    window.cpConfirmarCancelamento = function(){
      var id = document.getElementById('cpCancCompraId').value;
      var motivo = document.getElementById('cpCancMotivo').value;
      var devolvido = document.getElementById('cpCancDevolvido').value;
      var taxas = document.getElementById('cpCancTaxas').value;
      var obs = document.getElementById('cpCancObs').value;
      var compra = comprasDB.buscar(id);
      if (!compra) return;
      _fechar('cpCancelarMd');
      var r = _resumo(compra);
      _abrirConfirmacao('Cancelar Contrato', 'Essa ação não pode ser desfeita. Tem certeza que deseja cancelar este contrato?', compra, r, function(){
        cancelarContrato(id, { motivo: motivo, valoresDevolvidos: devolvido, taxas: taxas, obs: obs });
        _renderDetalhe(id); _renderCards(); _renderLista();
      });
    };

    // ── Simulador ──
    window.cpAbrirSimulador = function(){
      document.getElementById('cpSimValor').value = '';
      document.getElementById('cpSimParcela').value = '';
      document.getElementById('cpSimPct').value = _configGet().percentualPadrao;
      document.getElementById('cpSimResultado').innerHTML = 'Preencha os valores acima para simular.';
      _abrir('cpSimMd');
    };
    window.cpAtualizarSimulador = function(){
      var vp = parseFloat(document.getElementById('cpSimValor').value) || 0;
      var parc = parseFloat(document.getElementById('cpSimParcela').value) || 0;
      var pct = parseFloat(document.getElementById('cpSimPct').value) || 70;
      var el = document.getElementById('cpSimResultado');
      if (!vp || !parc) { el.innerHTML = 'Preencha os valores acima para simular.'; return; }
      var s = simular(vp, parc, pct);
      el.innerHTML =
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Meta de ' + pct + '%</span><b style="color:var(--gold2);">' + fmtR(s.meta) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Previsão p/ atingir a meta</span><b>≈ ' + s.qtdParcelas + ' pagamento(s)</b></div>' +
        '<div style="display:flex;justify-content:space-between;"><span>Saldo após a meta</span><b>' + fmtR(s.saldoAposMeta) + '</b></div>';
    };

    // ══════════════════════════════════════════════════════════════
    // Itens 4 e 5 — Contrato PDF e Recibo PDF (revisado para o app
    // instalado no celular — Android/PWA/WebView/Chrome).
    //
    // window.open('', '_blank') + window.print() (versão anterior) é a
    // técnica mais comum em desktop, mas num PWA instalado é arriscada:
    // Chrome no Android às vezes abre a nova janela FORA do contêiner do
    // app instalado (te joga pra uma aba normal do navegador), e alguns
    // WebViews de apps empacotados nem implementam múltiplas janelas —
    // window.open() aí retorna null silenciosamente.
    //
    // Troquei a estratégia principal para um <iframe> oculto na própria
    // página + iframe.contentWindow.print(): fica dentro do mesmo
    // contexto/janela (não depende de pop-up nem de suporte a múltiplas
    // janelas), funciona igual em desktop, e é o padrão recomendado para
    // impressão programática dentro de PWAs. Ainda assim, guardo o
    // window.open como fallback só para o caso raro de um WebView que
    // também não implemente print() dentro de iframe (nesse caso pelo
    // menos abre o conteúdo pra visualizar/compartilhar manualmente).
    //
    // Continua sem biblioteca externa — o app não carrega jsPDF/html2pdf
    // em lugar nenhum, e a técnica acima não precisa de nenhuma.
    // ══════════════════════════════════════════════════════════════

    function _cpDocAbrirEImprimir(html){
      try {
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        document.body.appendChild(iframe);
        var doc = iframe.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
        var limpar = function(){ setTimeout(function(){ if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1500); };
        iframe.onload = function(){
          try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
          catch(e){ limpar(); _cpDocFallbackNovaAba(html); return; }
          limpar();
        };
      } catch(e){
        _cpDocFallbackNovaAba(html);
      }
    }
    function _cpDocFallbackNovaAba(html){
      var w = window.open('', '_blank');
      if (!w) { alert('Não foi possível gerar o documento. Se estiver no app instalado, tente abrir pelo Chrome normal, ou permita pop-ups para este site e tente de novo.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      setTimeout(function(){ try { w.focus(); w.print(); } catch(e){} }, 350);
    }

    // ── item 5: compartilhar (Web Share API, com fallback seguro) ──
    // Sem biblioteca de geração de PDF, não dá pra compartilhar um arquivo
    // PDF de verdade sem adicionar peso ao app — então o compartilhamento
    // aqui é em TEXTO (mesmo padrão que o recibo por WhatsApp já usava),
    // que é o que a Web Share API do Android aceita sem precisar de
    // biblioteca nenhuma. Gerar/imprimir o PDF continua funcionando do
    // mesmo jeito, sem depender disso — isto é só um atalho a mais.
    function _cpCompartilhar(titulo, texto){
      if (navigator.share) {
        navigator.share({ title: titulo, text: texto }).catch(function(){ /* usuário cancelou — normal, não é erro */ });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(function(){ alert('Compartilhamento direto não disponível neste navegador — copiei o texto para você colar onde quiser.'); })
          .catch(function(){ alert('Compartilhamento não disponível neste navegador. Use o WhatsApp ou o PDF para enviar.'); });
        return;
      }
      alert('Compartilhamento não disponível neste navegador. Use o WhatsApp ou o PDF para enviar.');
    }

    var _cpDocCSS =
      'body{font-family:Arial,Helvetica,sans-serif;color:#222;max-width:760px;margin:0 auto;padding:28px;font-size:13px;line-height:1.5;}' +
      '.cpd-cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #b8963f;padding-bottom:10px;margin-bottom:18px;}' +
      '.cpd-emp{font-size:18px;font-weight:700;color:#1a1305;}' +
      '.cpd-sub{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a7a4a;}' +
      '.cpd-meta{text-align:right;font-size:11px;color:#555;}' +
      '.cpd-sec-tit{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8a7a4a;font-weight:700;border-bottom:1px solid #ddd;padding-bottom:3px;margin:16px 0 8px;}' +
      '.cpd-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;}' +
      '.cpd-grid div{padding:2px 0;}' +
      '.cpd-grid b{display:block;font-size:9px;text-transform:uppercase;color:#999;font-weight:600;}' +
      'table.cpd-tab{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;}' +
      'table.cpd-tab th{text-align:left;font-size:9px;text-transform:uppercase;color:#999;border-bottom:1px solid #ccc;padding:4px 6px;}' +
      'table.cpd-tab td{padding:5px 6px;border-bottom:1px solid #eee;}' +
      '.cpd-clausulas{font-size:11.5px;color:#333;background:#faf7ee;border:1px solid #e8dfc4;border-radius:6px;padding:12px 14px;}' +
      '.cpd-assin{display:flex;justify-content:space-between;margin-top:50px;gap:30px;}' +
      '.cpd-assin div{flex:1;text-align:center;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555;}' +
      '.cpd-foot{margin-top:24px;font-size:9px;color:#aaa;text-align:center;}' +
      '@media print{ body{padding:0;} }';

    function _cpDocCabecalho(numero, dataLabel){
      return '<div class="cpd-cab"><div><div class="cpd-emp">HR Mármores e Granitos</div><div class="cpd-sub">Compra Programada HR</div></div>' +
        '<div class="cpd-meta">Contrato: <b>' + numero + '</b><br>Data: ' + dataLabel + '</div></div>';
    }

    /** CPF/CNPJ, endereço (cliente) e material/pedra (projeto) — o schema
     *  real de HRdb.clientes e os campos de material em HRdb.orcamentos
     *  NÃO estão nos arquivos que recebi (app-clientes.js e o módulo que
     *  cria os orçamentos não foram enviados), então NÃO adivinho nomes
     *  de campo aqui — isso já causou um problema real antes (cpf/endereco/
     *  pedra eram só palpites). Fica "—" até você me passar os nomes reais
     *  (ou o arquivo app-clientes.js). O único campo de orçamento confirmado
     *  no código existente é `tipo` (tipo de projeto, ex. "Cozinha") — não é
     *  material/pedra, e já é usado em outro lugar (Descrição do Projeto),
     *  então não o reaproveito aqui pra não exibir a coisa errada com uma
     *  legenda de "Material". */
    function _cpDadosClienteExtra(compra){
      return { doc: '', endereco: '' }; // TODO: preencher quando os campos reais forem confirmados
    }
    function _cpDadosProjetoExtra(compra){
      return { material: '' }; // TODO: preencher quando os campos reais forem confirmados
    }

    window.cpGerarContrato = function(id){
      var compra = comprasDB.buscar(id);
      if (!compra) return;
      var r = _resumo(compra);
      var cfg = _configGet();
      var pagamentos = pagamentosDB.listar({compraId:id}).filter(function(p){ return !p.estornado; }).sort(function(a,b){ return a.data < b.data ? -1 : 1; });
      var clienteExtra = _cpDadosClienteExtra(compra);
      var projetoExtra = _cpDadosProjetoExtra(compra);

      var textoExplicativo =
        '<p style="margin:0 0 8px;">O projeto será considerado financeiramente apto a entrar no cronograma de produção após atingir <b>' + (compra.percentualLiberacao||70) + '%</b> do valor total definido neste contrato.</p>' +
        '<p style="margin:0 0 8px;">Atingir esse percentual <b>não significa instalação imediata</b>. Antes da fabricação, a empresa poderá realizar nova conferência de medidas no local.</p>' +
        '<p style="margin:0;">Este texto é apenas explicativo — não substitui cláusulas jurídicas formais.</p>';
      var blocoClausulas = cfg.textoJuridico && cfg.textoJuridico.trim()
        ? '<div class="cpd-clausulas">' + cfg.textoJuridico.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</div>'
        : '<div class="cpd-clausulas">' + textoExplicativo + '</div>';

      var linhasPag = pagamentos.map(function(p){
        return '<tr><td>' + dataBR(p.data) + '</td><td>' + (p.forma||'—') + '</td><td>' + (p.numeroAmigavel||'—') + '</td><td style="text-align:right;">' + fmtR(p.valor) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" style="color:#999;">Nenhum pagamento registrado até o momento.</td></tr>';

      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Contrato ' + compra.numero + '</title><style>' + _cpDocCSS + '</style></head><body>' +
        _cpDocCabecalho(compra.numero, dataBR(hoje())) +
        '<div class="cpd-sec-tit">Dados do Cliente</div>' +
        '<div class="cpd-grid">' +
          '<div><b>Nome</b>' + (compra.clienteNome||'—') + '</div>' +
          '<div><b>Telefone</b>' + (compra.clienteTel||'—') + '</div>' +
          '<div><b>CPF/CNPJ</b>' + (clienteExtra.doc||'—') + '</div>' +
          '<div><b>Endereço</b>' + (clienteExtra.endereco||'—') + '</div>' +
        '</div>' +
        '<div class="cpd-sec-tit">Dados do Projeto</div>' +
        '<div class="cpd-grid">' +
          '<div><b>Descrição</b>' + (compra.projetoTitulo||'—') + '</div>' +
          '<div><b>Pedra / Material</b>' + (projetoExtra.material||'—') + '</div>' +
          '<div><b>Valor original</b>' + fmtR(compra.valorOriginal) + '</div>' +
          '<div><b>Valor atualizado</b>' + fmtR(compra.valorAtual) + '</div>' +
        '</div>' +
        '<div class="cpd-sec-tit">Condições da Compra Programada</div>' +
        '<div class="cpd-grid">' +
          '<div><b>Valor da parcela</b>' + (compra.valorParcela ? fmtR(compra.valorParcela) : '—') + '</div>' +
          '<div><b>Dia de vencimento</b>' + (compra.diaVencimento||'—') + '</div>' +
          '<div><b>Percentual p/ liberação</b>' + (compra.percentualLiberacao||70) + '%</div>' +
          '<div><b>Data de início</b>' + dataBR(compra.dataPrimeiroPagamento) + '</div>' +
        '</div>' +
        blocoClausulas +
        '<div class="cpd-sec-tit">Pagamentos Realizados até Esta Geração</div>' +
        '<table class="cpd-tab"><thead><tr><th>Data</th><th>Forma</th><th>Nº</th><th style="text-align:right;">Valor</th></tr></thead><tbody>' + linhasPag + '</tbody></table>' +
        '<div class="cpd-grid" style="margin-top:8px;">' +
          '<div><b>Total pago</b>' + fmtR(r.totalPago) + '</div>' +
          '<div><b>Saldo</b>' + fmtR(Math.max(0,r.saldo)) + '</div>' +
          '<div><b>Percentual já pago</b>' + r.percentual.toFixed(1) + '%</div>' +
          '<div><b>Prazo estimado de fabricação</b>' + (compra.prazoFabricacaoDias ? compra.prazoFabricacaoDias + ' dias' : '—') + '</div>' +
        '</div>' +
        (compra.observacoes ? '<div class="cpd-sec-tit">Observações</div><div style="font-size:12px;">' + compra.observacoes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</div>' : '') +
        '<div class="cpd-assin"><div>Assinatura do Cliente<br>Data: ____/____/______</div><div>Assinatura da Empresa<br>Data: ____/____/______</div></div>' +
        '<div class="cpd-foot">HR Mármores e Granitos — Contrato ' + compra.numero + ' — gerado em ' + new Date().toLocaleString('pt-BR') + '</div>' +
        '</body></html>';

      _cpDocAbrirEImprimir(html);
    };

    window.cpGerarReciboPDF = function(pagamentoId){
      var p = pagamentosDB.listar(function(x){return x.id===pagamentoId;})[0];
      if (!p) return;
      var compra = comprasDB.buscar(p.compraId);
      var totalPago = _totalPago(compra.id);
      var r = _resumo(compra);
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Recibo ' + (p.numeroAmigavel||p.id) + '</title><style>' + _cpDocCSS + '</style></head><body>' +
        _cpDocCabecalho(compra.numero, dataBR(p.data)) +
        '<div class="cpd-sec-tit">Recibo de Pagamento — ' + (p.numeroAmigavel||'—') + '</div>' +
        '<div class="cpd-grid">' +
          '<div><b>Cliente</b>' + (compra.clienteNome||'—') + '</div>' +
          '<div><b>Projeto</b>' + (compra.projetoTitulo||'—') + '</div>' +
          '<div><b>Valor recebido</b>' + fmtR(p.valor) + '</div>' +
          '<div><b>Forma de pagamento</b>' + (p.forma||'—') + '</div>' +
          '<div><b>Data</b>' + dataBR(p.data) + '</div>' +
          '<div><b>Total pago acumulado</b>' + fmtR(totalPago) + '</div>' +
          '<div><b>Saldo atualizado</b>' + fmtR(Math.max(0,r.saldo)) + '</div>' +
          '<div><b>Percentual pago</b>' + r.percentual.toFixed(1) + '%</div>' +
        '</div>' +
        '<div class="cpd-assin"><div>Assinatura da Empresa<br>Data: ____/____/______</div></div>' +
        '<div class="cpd-foot">HR Mármores e Granitos — Recibo ' + (p.numeroAmigavel||p.id) + ' — gerado em ' + new Date().toLocaleString('pt-BR') + '</div>' +
        '</body></html>';
      _cpDocAbrirEImprimir(html);
    };

    // ── Recibo (WhatsApp) ──
    function _cpTextoRecibo(p, compra){
      var totalPago = _totalPago(compra.id);
      var r = _resumo(compra);
      return '🧾 *HR Mármores e Granitos*\n' +
        'Recibo — Compra Programada HR\n\n' +
        'Contrato: ' + compra.numero + '\n' +
        'Cliente: ' + compra.clienteNome + '\n' +
        (compra.projetoTitulo ? ('Projeto: ' + compra.projetoTitulo + '\n') : '') +
        '\nValor recebido: ' + fmtR(p.valor) + '\n' +
        'Forma de pagamento: ' + (p.forma||'—') + '\n' +
        'Data: ' + dataBR(p.data) + '\n\n' +
        'Total pago acumulado: ' + fmtR(totalPago) + '\n' +
        'Saldo atualizado: ' + fmtR(Math.max(0,r.saldo)) + '\n' +
        'Percentual pago: ' + r.percentual.toFixed(1) + '%\n';
    }
    window.cpGerarRecibo = function(pagamentoId){
      var p = pagamentosDB.listar(function(x){return x.id===pagamentoId;})[0];
      if (!p) return;
      var compra = comprasDB.buscar(p.compraId);
      var url = 'https://wa.me/' + (compra.clienteTel||'').replace(/\D/g,'') + '?text=' + encodeURIComponent(_cpTextoRecibo(p, compra));
      window.open(url, '_blank');
    };
    window.cpCompartilharRecibo = function(pagamentoId){
      var p = pagamentosDB.listar(function(x){return x.id===pagamentoId;})[0];
      if (!p) return;
      var compra = comprasDB.buscar(p.compraId);
      _cpCompartilhar('Recibo — ' + compra.numero, _cpTextoRecibo(p, compra));
    };

    function _cpTextoContrato(compra, r){
      return '📦 *HR Mármores e Granitos*\n' +
        'Compra Programada — Contrato ' + compra.numero + '\n\n' +
        'Cliente: ' + compra.clienteNome + '\n' +
        (compra.projetoTitulo ? ('Projeto: ' + compra.projetoTitulo + '\n') : '') +
        '\nValor atualizado: ' + fmtR(compra.valorAtual) + '\n' +
        'Total pago: ' + fmtR(r.totalPago) + '\n' +
        'Saldo: ' + fmtR(Math.max(0,r.saldo)) + '\n' +
        'Percentual pago: ' + r.percentual.toFixed(1) + '%\n' +
        'Meta para liberar produção: ' + (compra.percentualLiberacao||70) + '%\n';
    }
    window.cpCompartilharContrato = function(id){
      var compra = comprasDB.buscar(id);
      if (!compra) return;
      var r = _resumo(compra);
      _cpCompartilhar('Contrato ' + compra.numero, _cpTextoContrato(compra, r));
    };

    // ── Tela do cliente (visualização bonita, somente leitura) ──
    window.cpVerTelaCliente = function(id){
      var compra = comprasDB.buscar(id);
      var r = _resumo(compra);
      var metaPct = Math.min(100, compra.percentualLiberacao||70);
      var barPct = Math.min(100, r.percentual);
      var h = '<div class="cp-client-hero">' +
        '<div style="font-size:.68rem;letter-spacing:2px;color:var(--t3);text-transform:uppercase;">Compra Programada HR</div>' +
        '<div style="font-size:.95rem;font-weight:700;margin-top:6px;">' + (compra.projetoTitulo || 'Seu Projeto') + '</div>' +
        '<div class="cp-client-big" style="margin-top:10px;">' + r.percentual.toFixed(0) + '%</div>' +
        '<div class="cp-bar-wrap" style="height:12px;margin:12px auto;max-width:280px;"><div class="cp-bar" style="width:' + barPct + '%;"></div><div class="cp-bar-meta" style="left:' + metaPct + '%;"></div></div>' +
      '</div>';
      h += '<div class="r2"><div class="f"><label>Valor atualizado</label><span>' + fmtR(compra.valorAtual) + '</span></div><div class="f"><label>Pago</label><span>' + fmtR(r.totalPago) + '</span></div></div>';
      h += '<div class="r2"><div class="f"><label>Saldo</label><span>' + fmtR(Math.max(0,r.saldo)) + '</span></div><div class="f"><label>Meta p/ produção</label><span>' + metaPct + '%</span></div></div>';
      if (r.faltaParaMeta > 0) h += '<div class="f"><label>Falta para liberar</label><span>' + fmtR(r.faltaParaMeta) + '</span></div>';
      if (r.proximaParcela) h += '<div class="f"><label>Próxima parcela</label><span>' + fmtR(r.proximaParcela.valor) + ' — vence ' + dataBR(r.proximaParcela.data) + '</span></div>';
      if (r.statusFinanceiro === 'liberado' || r.statusFinanceiro === 'quitado') {
        h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:12px;padding:14px;margin-top:12px;text-align:center;">' +
          '<div style="font-size:1.1rem;margin-bottom:4px;">🎉 SEU PROJETO ATINGIU A META!</div>' +
          '<div style="font-size:.75rem;color:var(--t2);">Seu projeto está financeiramente liberado para entrar no cronograma de produção. Nossa equipe entrará em contato para confirmar medidas e demais detalhes.</div>' +
        '</div>';
      }
      document.getElementById('cpClienteConteudo').innerHTML = h;
      _abrir('cpClienteMd');
    };


    // ══════════════════════════════════════════════════════════════
    // 7. BOTÃO DE ACESSO — injetado no grid de acesso rápido do
    //    dashboard se existir; senão, botão flutuante próprio.
    // ══════════════════════════════════════════════════════════════

    var quickGrid = document.querySelector('.sp2-quick');
    if (quickGrid) {
      var btn = document.createElement('button');
      btn.className = 'sp2-q-btn';
      btn.innerHTML = '<span class="sp2-q-ic">📦</span><div><div class="sp2-q-title">Compra Programada</div><div class="sp2-q-sub">Pagamento parcelado</div></div>';
      btn.addEventListener('click', function(){ window.cpAbrirPainel(); });
      quickGrid.appendChild(btn);
    } else {
      var fab = document.createElement('button');
      fab.className = 'cp-fab';
      fab.textContent = '📦 Compra Programada';
      fab.addEventListener('click', function(){ window.cpAbrirPainel(); });
      document.body.appendChild(fab);
    }

    console.log('[CompraProgramada] Módulo inicializado.');
  }

})();
