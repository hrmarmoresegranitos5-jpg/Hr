// ╔══════════════════════════════════════════════════════════════════╗
// ║          HR MÁRMORES — INTEGRADOR v1.0                          ║
// ║          Camada de Integração: Orçamentos → Agenda → Financeiro ║
// ║                                                                  ║
// ║  O que faz:                                                      ║
// ║    Ao aprovar orçamento via confirmarAgenda() (legado):          ║
// ║      ✓ Cria Serviço   no HRdb.servicos                          ║
// ║      ✓ Cria Agenda    no HRdb.agenda                            ║
// ║      ✓ Cria A Receber no HRdb.financeiro (total)                ║
// ║      ✓ Cria Entrada   no HRdb.financeiro (50% se pago)          ║
// ║      ✓ Vincula Cliente automático                               ║
// ║      ✓ Atualiza status do orçamento                             ║
// ║      ✓ Mantém DB.j / DB.t / DB.q intactos (legado OK)          ║
// ║                                                                  ║
// ║  Carregar APÓS: hr-db-core.js, financeiro.js                    ║
// ║  ANTES de:     app-orcamento.js (ou no final — ambos funcionam) ║
// ╚══════════════════════════════════════════════════════════════════╝

;(function(global) {
  'use strict';

  // ══════════════════════════════════════════════════════════════════
  // GUARDA: não rodar sem HRdb
  // ══════════════════════════════════════════════════════════════════
  if (typeof HRdb === 'undefined') {
    console.error('[HRIntegrador] HRdb não encontrado. Carregue hr-db-core.js antes.');
    return;
  }

  // ══════════════════════════════════════════════════════════════════
  // UTILITÁRIOS LOCAIS
  // ══════════════════════════════════════════════════════════════════

  function _hoje() {
    var d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /** Adiciona N dias a uma data YYYY-MM-DD */
  function _addDias(dataStr, dias) {
    var d = new Date((dataStr || _hoje()) + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /** Última data de fim da agenda legada (para calcular início) */
  function _ultimoFimAgenda() {
    if (typeof DB === 'undefined' || !DB.j || !DB.j.length) return _hoje();
    var pendentes = DB.j.filter(function(j) { return !j.done && j.end; });
    if (!pendentes.length) return _hoje();
    var ends = pendentes.map(function(j) { return j.end; }).sort();
    return ends[ends.length - 1];
  }

  /** Exibe toast de forma segura */
  function _toast(msg) {
    if (typeof toast === 'function') { toast(msg); return; }
    console.log('[HR]', msg);
  }

  /** Exibe confirm box de forma segura (com fallback) */
  function _confirm(msg, onSim, onNao) {
    if (typeof showCB === 'function') {
      showCB(msg, onSim, onNao);
      return;
    }
    if (confirm(msg)) { onSim && onSim(); }
    else { onNao && onNao(); }
  }

  function _hideCB() {
    if (typeof hideCB === 'function') hideCB();
  }

  /** Busca ou cria cliente a partir de dados do orçamento legado */
  function _resolverCliente(q) {
    if (!q) return null;

    // Tenta por telefone primeiro
    if (q.tel) {
      var porTel = HRdb.clientes.listar(function(c) {
        return c.tel === q.tel || c.tel2 === q.tel;
      });
      if (porTel.length) {
        HRdb.clientes.atualizar(porTel[0].id, {
          ultimoContato: _hoje(),
          qtdOrcamentos: (porTel[0].qtdOrcamentos || 0) + 1
        });
        return porTel[0];
      }
    }

    // Cria novo cliente
    if (q.cli) {
      return HRdb.clientes.criar({
        nome:   q.cli,
        tel:    q.tel    || '',
        cidade: q.cidade || '',
        end:    q.end    || '',
        obs:    q.obs    || '',
        ultimoContato: _hoje(),
        qtdOrcamentos: 1
      });
    }

    return null;
  }

  /** Verifica duplicata na agenda HRdb antes de criar */
  function _jaExisteNaAgenda(jobLegadoId) {
    var id = String(jobLegadoId);
    return HRdb.agenda.listar(function(a) {
      return String(a.id) === id || String(a._legadoId) === id;
    }).length > 0;
  }

  /** Verifica duplicata no financeiro HRdb */
  function _jaExisteFinanceiro(refId, tipo) {
    return HRdb.financeiro.listar(function(t) {
      return t._refLegadoId === String(refId) && t._refTipo === tipo;
    }).length > 0;
  }

  // ══════════════════════════════════════════════════════════════════
  // NÚCLEO DA INTEGRAÇÃO
  // Chamado logo após criar o job legado (DB.j.unshift) e salvar DB.sv()
  // ══════════════════════════════════════════════════════════════════

  /**
   * Integra um job legado recém-criado ao HRdb.
   *
   * @param {Object} job   — objeto criado em DB.j (id, cli, desc, start, end, value, pago, obs, done)
   * @param {Object} orc   — orçamento de origem (pendQ do sistema legado)
   * @param {Object} opts  — { entradaPaga: boolean, valorEntrada: number }
   */
  function _integrarAprovacao(job, orc, opts) {
    opts = opts || {};

    // Guard: evita duplicação se já integrado
    if (_jaExisteNaAgenda(job.id)) {
      console.warn('[HRIntegrador] Job ' + job.id + ' já integrado. Skip.');
      return null;
    }

    // 1. Cliente
    var cliente = _resolverCliente(orc || { cli: job.cli, tel: '' });
    var clienteId = cliente ? cliente.id : '';

    // 2. Orçamento no HRdb — busca ou registra
    var orcHRdb = null;
    if (orc) {
      var orcId = String(orc.id);
      orcHRdb = HRdb.orcamentos.buscar(orcId);
      if (!orcHRdb) {
        // Importa o orçamento legado pontualmente
        orcHRdb = HRdb.orcamentos.criar(Object.assign({}, orc, {
          id: orcId,
          clienteId: clienteId,
          _legado: true,
          date: orc.date || _hoje()
        }));
      }
      // Atualiza status do orçamento para aprovado
      HRdb.orcamentos.atualizar(orcHRdb.id, { status: 'aprovado' });
    }

    // 3. Serviço
    var servico = HRdb.servicos.criar({
      clienteId:    clienteId,
      orcamentoId:  orcHRdb ? orcHRdb.id : '',
      titulo:       job.desc || (orc ? (orc.tipo + ' — ' + orc.mat) : 'Serviço'),
      tipo:         orc ? (orc.tipo || '') : '',
      pedra:        orc ? (orc.mat  || '') : '',
      pedraId:      orc ? (orc.matId || '') : '',
      ambientes:    orc ? (orc.ambSnap || []) : [],
      m2:           orc ? (orc.m2 || 0) : 0,
      valorTotal:   job.value || 0,
      valorPago:    job.pago  || 0,
      dataInicio:   job.start || _hoje(),
      dataEntrega:  job.end   || '',
      status:       'em_producao',
      prioridade:   'normal',
      obs:          job.obs  || (orc ? orc.obs : '') || ''
    });

    // 4. Agenda HRdb
    var agendaItem = HRdb.agenda.criar({
      id:          String(job.id),   // mesmo ID que o legado
      clienteId:   clienteId,
      servicoId:   servico.id,
      orcamentoId: orcHRdb ? orcHRdb.id : '',
      cli:         job.cli   || '',
      desc:        job.desc  || '',
      start:       job.start || _hoje(),
      end:         job.end   || '',
      value:       job.value || 0,
      pago:        job.pago  || 0,
      done:        false,
      status:      'em_producao',
      obs:         job.obs   || '',
      _legadoId:   String(job.id)
    });

    // Vincula o serviço à agenda
    HRdb.servicos.atualizar(servico.id, { agendaId: agendaItem.id });

    // 5. Financeiro — "A Receber" (total do serviço)
    var valorTotal = job.value || 0;
    var valorPago  = job.pago  || 0;
    var restante   = Math.max(0, valorTotal - valorPago);

    if (restante > 0) {
      HRdb.financeiro.criar({
        type:          'pend',
        categoria:     'venda',
        subcategoria:  'a_receber',
        desc:          'A Receber — ' + (job.cli || ''),
        value:         restante,
        date:          _hoje(),
        dataVencimento: job.end || '',
        clienteId:     clienteId,
        servicoId:     servico.id,
        agendaId:      agendaItem.id,
        orcamentoId:   orcHRdb ? orcHRdb.id : '',
        status:        'pendente',
        observacoes:   'Saldo restante do serviço',
        _refLegadoId:  String(job.id),
        _refTipo:      'areceber'
      });
    }

    // 6. Financeiro — entrada já paga (se informado)
    if (opts.entradaPaga && opts.valorEntrada > 0) {
      HRdb.financeiro.criar({
        type:           'in',
        categoria:      'venda',
        subcategoria:   'entrada',
        desc:           'Entrada 50% — ' + (job.cli || ''),
        value:          opts.valorEntrada,
        date:           _hoje(),
        dataPagamento:  _hoje(),
        clienteId:      clienteId,
        servicoId:      servico.id,
        agendaId:       agendaItem.id,
        orcamentoId:    orcHRdb ? orcHRdb.id : '',
        status:         'confirmado',
        formaPagamento: '',
        observacoes:    'Entrada registrada na aprovação do orçamento',
        _refLegadoId:   String(job.id),
        _refTipo:       'entrada'
      });

      // Atualiza valorPago no serviço
      HRdb.servicos.atualizar(servico.id, { valorPago: opts.valorEntrada });

      // Atualiza pago na agenda HRdb
      HRdb.agenda.atualizar(agendaItem.id, { pago: opts.valorEntrada });

      // Atualiza cliente — total gasto
      if (cliente) {
        var cliAtual = HRdb.clientes.buscar(cliente.id);
        if (cliAtual) {
          HRdb.clientes.atualizar(cliente.id, {
            totalGasto: (cliAtual.totalGasto || 0) + opts.valorEntrada,
            qtdServicos: (cliAtual.qtdServicos || 0) + 1
          });
        }
      }
    }

    // 7. Emite evento para módulos ouvintes (ex: FIN.render())
    HRdb.emit('integrador:aprovado', {
      job:      job,
      servico:  servico,
      agenda:   agendaItem,
      cliente:  cliente,
      orcamento: orcHRdb
    });

    console.log('[HRIntegrador] ✓ Aprovação integrada:', job.cli, '| Serviço:', servico.id);
    return { servico: servico, agenda: agendaItem, cliente: cliente };
  }

  // ══════════════════════════════════════════════════════════════════
  // INTEGRAÇÃO DE PAGAMENTO
  // Chamado quando addTr('in', ...) é chamado para um job existente
  // ══════════════════════════════════════════════════════════════════

  function _integrarPagamento(jobId, valor, desc, tipo) {
    var id = String(jobId || '');

    // Busca agenda HRdb pelo ID legado
    var agItems = HRdb.agenda.listar(function(a) {
      return String(a.id) === id || String(a._legadoId) === id;
    });
    if (!agItems.length) return; // job não integrado — ok, legado funciona normalmente

    var ag = agItems[0];

    // Busca serviço vinculado
    var srv = ag.servicoId ? HRdb.servicos.buscar(ag.servicoId) : null;

    // Cria transação no HRdb.financeiro
    var tr = HRdb.financeiro.criar({
      type:           'in',
      categoria:      'venda',
      desc:           desc || ('Pagamento — ' + ag.cli),
      value:          valor || 0,
      date:           _hoje(),
      dataPagamento:  _hoje(),
      clienteId:      ag.clienteId || '',
      servicoId:      ag.servicoId || '',
      agendaId:       ag.id,
      orcamentoId:    ag.orcamentoId || '',
      status:         'confirmado',
      observacoes:    tipo || 'pagamento',
      _refLegadoId:   id,
      _refTipo:       'pagamento_' + (tipo || 'parcial')
    });

    // Atualiza pago na agenda HRdb
    var novoPago = (ag.pago || 0) + (valor || 0);
    HRdb.agenda.atualizar(ag.id, {
      pago: novoPago,
      done: novoPago >= (ag.value || 0)
    });

    // Atualiza serviço
    if (srv) {
      var novoSrvPago = (srv.valorPago || 0) + (valor || 0);
      HRdb.servicos.atualizar(srv.id, {
        valorPago: novoSrvPago,
        status: novoSrvPago >= srv.valorTotal ? 'entregue' : srv.status
      });
    }

    // Atualiza métricas do cliente
    if (ag.clienteId) {
      var cli = HRdb.clientes.buscar(ag.clienteId);
      if (cli) {
        HRdb.clientes.atualizar(cli.id, {
          totalGasto: (cli.totalGasto || 0) + (valor || 0)
        });
      }
    }

    // Marca "a receber" como confirmado se quitado
    if (novoPago >= (ag.value || 0)) {
      var pendentes = HRdb.financeiro.listar(function(t) {
        return t._refLegadoId === id && t._refTipo === 'areceber' && t.status === 'pendente';
      });
      pendentes.forEach(function(p) {
        HRdb.financeiro.atualizar(p.id, { status: 'cancelado', observacoes: 'Serviço quitado' });
      });
    }

    HRdb.emit('integrador:pagamento', { jobId: id, valor: valor, transacao: tr });
    console.log('[HRIntegrador] ✓ Pagamento integrado:', ag.cli, 'R$', valor);
  }

  // ══════════════════════════════════════════════════════════════════
  // INTEGRAÇÃO DE CONCLUSÃO
  // Chamado quando togJob() marca um job como done
  // ══════════════════════════════════════════════════════════════════

  function _integrarConclusao(jobId) {
    var id = String(jobId || '');

    var agItems = HRdb.agenda.listar(function(a) {
      return String(a.id) === id || String(a._legadoId) === id;
    });
    if (!agItems.length) return;

    var ag = agItems[0];
    HRdb.agenda.atualizar(ag.id, { done: true, dataReal: _hoje(), status: 'entregue' });

    if (ag.servicoId) {
      HRdb.servicos.atualizar(ag.servicoId, { status: 'entregue', dataConcluido: _hoje() });
    }

    HRdb.emit('integrador:concluido', { jobId: id, agendaId: ag.id });
    console.log('[HRIntegrador] ✓ Conclusão integrada:', ag.cli);
  }

  // ══════════════════════════════════════════════════════════════════
  // INTERCEPTADORES DAS FUNÇÕES LEGADAS
  // Wrap cirúrgico — sem quebrar comportamento original
  // ══════════════════════════════════════════════════════════════════

  /**
   * Wrap de confirmarAgenda()
   * Original: cria job, salva DB, mostra confirmação de entrada
   * Adicionamos: integrar ao HRdb após o job legado ser criado
   */
  var _confirmarAgendaOriginal = global.confirmarAgenda;

  global.confirmarAgenda = function() {
    // Captura pendQ e estado ANTES da chamada original
    var q = global.pendQ || null;

    // Calcula início e fim igual ao original para reproduzir o job
    var d = parseInt((document.getElementById('diasIn') || {}).value, 10) || 0;
    if (!d || !q) {
      // Sem dados suficientes — chama original normalmente
      if (typeof _confirmarAgendaOriginal === 'function') _confirmarAgendaOriginal();
      return;
    }

    var s = (typeof lastEnd === 'function' ? lastEnd() : null) || (typeof td === 'function' ? td() : _hoje());
    var end = (typeof addD === 'function') ? addD(s, d) : _addDias(s, d);

    // Chama o original — ele cria o job em DB.j e chama showCB para entrada
    if (typeof _confirmarAgendaOriginal === 'function') {
      _confirmarAgendaOriginal();
    }

    // Após o original, encontramos o job recém-criado por correspondência (cli + end)
    // O original usa Date.now() como id — pegamos o mais recente da agenda
    setTimeout(function() {
      if (typeof DB === 'undefined' || !DB.j || !DB.j.length) return;

      // Job mais recente com mesmo cli e end
      var jobNovo = DB.j.find(function(j) {
        return j.cli === q.cli && j.end === end && !j.done;
      });
      if (!jobNovo) {
        // Fallback: primeiro da lista (mais recente)
        jobNovo = DB.j[0];
      }

      if (!jobNovo) return;

      // Integra ao HRdb (sem entrada por padrão — aguarda confirmação do usuário)
      _integrarAprovacao(jobNovo, q, { entradaPaga: false });
    }, 200);
  };

  /**
   * Wrap de addTr()
   * Original: adiciona transação no DB.t legado e chama renderFin()
   * Adicionamos: propagar ao HRdb.financeiro com contexto de job
   *
   * addTr(type, desc, value) — assinatura original
   */
  var _addTrOriginal = global.addTr;

  global.addTr = function(type, desc, value) {
    // Chama original primeiro
    if (typeof _addTrOriginal === 'function') {
      _addTrOriginal(type, desc, value);
    }

    // Tenta identificar qual job está relacionado a esta transação
    // O padrão é: desc = "Entrada 50% — NomeCli" ou "Entrega — NomeCli" ou "Pagamento — NomeCli"
    var jobId = _identificarJobPorDesc(desc);

    if (jobId && type === 'in') {
      _integrarPagamento(jobId, value, desc, _tipoEntrada(desc));
    } else {
      // Transação genérica — registra no HRdb.financeiro sem vínculo de job
      _registrarTransacaoGenerica(type, desc, value);
    }
  };

  /** Tenta extrair nome do cliente de uma descrição e localizar o job */
  function _identificarJobPorDesc(desc) {
    if (!desc) return null;
    if (typeof DB === 'undefined' || !DB.j) return null;

    // Extrai nome após padrões conhecidos: "Entrada 50% — X", "Entrega — X", "Pagamento — X"
    var m = desc.match(/(?:Entrada\s+50%|Entrega|Pagamento)\s+—\s+(.+)/i);
    if (!m) return null;

    var nomeCli = m[1].trim();

    // Busca job ativo com esse nome
    var job = DB.j.find(function(j) {
      return j.cli === nomeCli && !j.done;
    });
    // Fallback: qualquer job com esse nome
    if (!job) {
      job = DB.j.find(function(j) { return j.cli === nomeCli; });
    }

    return job ? job.id : null;
  }

  function _tipoEntrada(desc) {
    if (!desc) return 'parcial';
    var d = desc.toLowerCase();
    if (d.indexOf('50%') >= 0 || d.indexOf('entrada') >= 0) return 'entrada';
    if (d.indexOf('entrega') >= 0) return 'entrega';
    return 'parcial';
  }

  /** Registra transação genérica (sem job) no HRdb */
  function _registrarTransacaoGenerica(type, desc, value) {
    // Evita duplicação: verifica se já existe com mesma desc e valor no mesmo dia
    var hoje = _hoje();
    var existe = HRdb.financeiro.listar(function(t) {
      return t.desc === desc && t.value === value && t.date === hoje && t.type === type;
    }).length > 0;

    if (existe) return; // Já sincronizado

    HRdb.financeiro.criar({
      type:       type,
      categoria:  type === 'in' ? 'venda' : (type === 'out' ? 'despesa' : 'outros'),
      desc:       desc || '',
      value:      value || 0,
      date:       hoje,
      status:     'confirmado',
      _legado:    true
    });
  }

  /**
   * Wrap de togJob()
   * Original: alterna done em DB.j e oferece registrar pagamento final
   * Adicionamos: propagar conclusão ao HRdb
   */
  var _togJobOriginal = global.togJob;

  global.togJob = function(id) {
    // Captura estado antes
    var jAntes = (typeof DB !== 'undefined' && DB.j)
      ? DB.j.find(function(j) { return j.id === id; })
      : null;
    var eraDone = jAntes ? jAntes.done : false;

    // Chama original
    if (typeof _togJobOriginal === 'function') {
      _togJobOriginal(id);
    }

    // Se era não-done e agora foi marcado como done
    if (!eraDone) {
      setTimeout(function() { _integrarConclusao(id); }, 300);
    }
  };

  /**
   * Wrap de pagRest()
   * Original: registra pagamento do restante via showCB + addTr
   * A integração já é capturada pelo wrap de addTr acima.
   * Mantemos aqui apenas para garantir que a conclusão seja propagada.
   */
  var _pagRestOriginal = global.pagRest;

  global.pagRest = function(id) {
    if (typeof _pagRestOriginal === 'function') {
      _pagRestOriginal(id);
    }
    // pagRest chama addTr internamente via showCB → já integrado pelo wrap de addTr
  };

  // ══════════════════════════════════════════════════════════════════
  // MIGRAÇÃO RETROATIVA
  // Importa jobs legados existentes que ainda não estão no HRdb
  // ══════════════════════════════════════════════════════════════════

  function _migrarJobsExistentes() {
    if (typeof DB === 'undefined' || !DB.j || !DB.j.length) return 0;

    var importados = 0;
    DB.j.forEach(function(job) {
      if (_jaExisteNaAgenda(job.id)) return;

      // Busca orçamento de origem pelo nome do cliente (heurística)
      var orcOrigem = null;
      if (DB.q && DB.q.length) {
        orcOrigem = DB.q.find(function(q) { return q.cli === job.cli; }) || null;
      }

      _integrarAprovacao(job, orcOrigem, {
        entradaPaga: job.pago > 0,
        valorEntrada: job.pago || 0
      });

      // Se job já concluído, atualiza status
      if (job.done) {
        setTimeout(function() { _integrarConclusao(job.id); }, 0);
      }

      importados++;
    });

    if (importados > 0) {
      console.log('[HRIntegrador] ✓ Migração retroativa:', importados, 'job(s) importado(s)');
    }
    return importados;
  }

  /** Migra transações legadas para HRdb.financeiro (sem duplicar) */
  function _migrarTransacoesLegadas() {
    if (typeof DB === 'undefined' || !DB.t || !DB.t.length) return 0;

    var hoje = _hoje();
    var importados = 0;

    DB.t.forEach(function(t) {
      var tId = String(t.id);
      var existe = HRdb.financeiro.listar(function(f) {
        return String(f.id) === tId || String(f._legadoTrId) === tId;
      }).length > 0;

      if (existe) return;

      HRdb.financeiro.criar(Object.assign({}, t, {
        id:          tId,
        categoria:   t.type === 'in' ? 'venda' : (t.type === 'out' ? 'despesa' : 'outros'),
        status:      'confirmado',
        _legado:     true,
        _legadoTrId: tId,
        date:        t.date || hoje
      }));

      importados++;
    });

    if (importados > 0) {
      console.log('[HRIntegrador] ✓ Transações migradas:', importados);
    }
    return importados;
  }

  // ══════════════════════════════════════════════════════════════════
  // LISTENER: re-renderiza FIN quando dados mudam
  // ══════════════════════════════════════════════════════════════════

  HRdb.on('integrador:aprovado', function() {
    _atualizarUISeVisivel();
  });

  HRdb.on('integrador:pagamento', function() {
    _atualizarUISeVisivel();
  });

  HRdb.on('integrador:concluido', function() {
    _atualizarUISeVisivel();
  });

  function _atualizarUISeVisivel() {
    // Atualiza FIN se estiver visível
    if (typeof FIN !== 'undefined' && FIN.render) {
      var pgFin = document.getElementById('pgFin');
      if (pgFin && pgFin.classList.contains('on')) {
        setTimeout(function() { FIN.render(); }, 100);
      }
    }
    // Atualiza agenda legada se visível
    if (typeof renderAg === 'function') {
      var pgAg = document.getElementById('pgAg');
      if (pgAg && pgAg.classList.contains('on')) {
        setTimeout(function() { renderAg(); }, 100);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO
  // ══════════════════════════════════════════════════════════════════

  function _init() {
    // Aguarda HRdb e DB legado estarem prontos
    var tentativas = 0;
    var maxTentativas = 20;

    function _tentar() {
      tentativas++;
      var dbPronto = typeof DB !== 'undefined' && DB.j && DB.q && DB.t;
      var hrdbPronto = typeof HRdb !== 'undefined';

      if (!hrdbPronto || !dbPronto) {
        if (tentativas < maxTentativas) {
          setTimeout(_tentar, 300);
          return;
        }
        console.warn('[HRIntegrador] DB não disponível após timeout. Integração parcial.');
      }

      // Migração retroativa das transações legadas
      _migrarTransacoesLegadas();

      // Migração retroativa dos jobs legados
      _migrarJobsExistentes();

      console.log('[HRIntegrador] v1.0 ativo — wrappers: confirmarAgenda, addTr, togJob, pagRest');
      HRdb.emit('integrador:pronto', { ts: Date.now() });
    }

    // Aguarda HRdb:pronto se ainda não disparou
    HRdb.on('hrdb:pronto', function() {
      setTimeout(_tentar, 200);
    });

    // Fallback: tenta direto também (caso hrdb:pronto já tenha ocorrido)
    setTimeout(_tentar, 500);
  }

  // ══════════════════════════════════════════════════════════════════
  // API PÚBLICA — HRIntegrador
  // ══════════════════════════════════════════════════════════════════

  var HRIntegrador = {

    /**
     * Integra manualmente um job legado (uso avançado).
     * Ex: HRIntegrador.integrar(DB.j[0], DB.q[0])
     */
    integrar: function(job, orc, opts) {
      return _integrarAprovacao(job, orc, opts);
    },

    /**
     * Registra pagamento manualmente por ID do job legado.
     * Ex: HRIntegrador.registrarPagamento(jobId, 1400, 'Entrada')
     */
    registrarPagamento: function(jobId, valor, desc) {
      _integrarPagamento(jobId, valor, desc, 'manual');
    },

    /**
     * Re-executa migração de todos os jobs e transações legados.
     * Útil após importar backup ou sincronizar com Firebase.
     */
    migrarTudo: function() {
      var t = _migrarTransacoesLegadas();
      var j = _migrarJobsExistentes();
      return { transacoes: t, jobs: j };
    },

    /**
     * Diagnóstico — quantos jobs estão integrados vs total.
     */
    status: function() {
      var totalJobs = (typeof DB !== 'undefined' && DB.j) ? DB.j.length : 0;
      var integrados = HRdb.agenda.count();
      var totalTr = (typeof DB !== 'undefined' && DB.t) ? DB.t.length : 0;
      var trHRdb = HRdb.financeiro.count();
      return {
        jobs:         { total: totalJobs, integrados: integrados },
        transacoes:   { total: totalTr, noHRdb: trHRdb },
        servicos:     HRdb.servicos.count(),
        clientes:     HRdb.clientes.count()
      };
    }
  };

  global.HRIntegrador = HRIntegrador;

  // Inicia automaticamente
  _init();

})(window);

// ══════════════════════════════════════════════════════════════════
// INSTRUÇÕES DE USO
// ══════════════════════════════════════════════════════════════════
//
// 1. ADICIONAR NO index.html (após hr-db-core.js e financeiro.js):
//    <script src="hr-integrador.js"></script>
//
// Ordem recomendada:
//    <script src="data-defaults.js"></script>
//    <script src="hr-db-core.js"></script>
//    <script src="financeiro.js"></script>
//    <script src="hr-integrador.js"></script>     ← aqui
//    <script src="app-init.js"></script>
//    <script src="app-orcamento.js"></script>
//    <script src="app-financas.js"></script>
//    ...
//
// 2. FLUXO AUTOMÁTICO após instalação:
//
//    [Usuário clica "Agendar" no orçamento]
//         ↓
//    salvarAgenda() → diasMd aberto (legado inalterado)
//         ↓
//    [Usuário informa os dias e confirma]
//         ↓
//    confirmarAgenda() INTERCEPTADO:
//      → Original cria job em DB.j, mostra toast (legado OK)
//      → Integrador cria: Serviço + Agenda HRdb + A Receber
//         ↓
//    [usuário confirma entrada de 50%]
//         ↓
//    addTr('in', 'Entrada 50% — Cliente', valor) INTERCEPTADO:
//      → Original salva em DB.t, chama renderFin() (legado OK)
//      → Integrador cria: transação 'in' confirmada no HRdb
//         ↓
//    [Serviço concluído — usuário clica ✓ na agenda]
//         ↓
//    togJob(id) INTERCEPTADO:
//      → Original alterna done em DB.j (legado OK)
//      → Integrador atualiza status para 'entregue' no HRdb
//
// 3. DIAGNÓSTICO:
//    console.log(HRIntegrador.status());
//
// 4. MIGRAÇÃO MANUAL (se necessário):
//    HRIntegrador.migrarTudo();
//
// ══════════════════════════════════════════════════════════════════
