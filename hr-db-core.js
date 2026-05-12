// ╔══════════════════════════════════════════════════════════════════╗
// ║          HR MÁRMORES — DB CORE v1.0                             ║
// ║          Arquitetura Central Modular                            ║
// ║                                                                  ║
// ║  Módulos:                                                        ║
// ║    HRdb.clientes   — cadastro de clientes                        ║
// ║    HRdb.orcamentos — orçamentos gerados                          ║
// ║    HRdb.servicos   — catálogo de serviços/trabalhos              ║
// ║    HRdb.agenda     — agendamentos (migrado de DB.j)              ║
// ║    HRdb.financeiro — transações (migrado de DB.t)                ║
// ║    HRdb.funcionarios — equipe interna                            ║
// ║                                                                  ║
// ║  Compatibilidade: mantém DB.q / DB.j / DB.t intactos            ║
// ║  Não quebra sistema antigo. Carregar APÓS data-defaults.js       ║
// ╚══════════════════════════════════════════════════════════════════╝

;(function(global){
  'use strict';

  // ══════════════════════════════════════════════════════════════════
  // UTILITÁRIOS INTERNOS
  // ══════════════════════════════════════════════════════════════════

  var _PREFIX = 'hrdb_';   // namespace isolado — não conflita com hr_q, hr_j, hr_t
  var _VER    = 1;         // versão do schema — para migrações futuras

  /** Gera ID único tipo "cli_1748000000000_r4x2" */
  function _uid(prefix) {
    return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  /** Data local no formato YYYY-MM-DD */
  function _hoje() {
    var d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /** Lê do localStorage com fallback seguro */
  function _load(key, fallback) {
    try {
      var raw = localStorage.getItem(_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) {
      console.warn('[HRdb] Falha ao carregar ' + key, e);
      return fallback;
    }
  }

  /** Salva no localStorage */
  function _save(key, data) {
    try {
      localStorage.setItem(_PREFIX + key, JSON.stringify(data));
      return true;
    } catch(e) {
      console.error('[HRdb] Falha ao salvar ' + key, e);
      // Possível quota excedida — notificar caller
      return false;
    }
  }

  /** Remove do localStorage */
  function _remove(key) {
    localStorage.removeItem(_PREFIX + key);
  }

  /** Cópia profunda simples */
  function _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** Valida campo obrigatório */
  function _req(obj, fields) {
    for (var i = 0; i < fields.length; i++) {
      if (!obj[fields[i]] && obj[fields[i]] !== 0) {
        throw new Error('[HRdb] Campo obrigatório ausente: ' + fields[i]);
      }
    }
  }


  // ══════════════════════════════════════════════════════════════════
  // EVENTO BUS — comunicação entre módulos sem acoplamento direto
  // ══════════════════════════════════════════════════════════════════
  // Uso: HRdb.on('financeiro:saved', fn)
  //      HRdb.emit('financeiro:saved', { id: '...' })

  var _listeners = {};

  var _bus = {
    on: function(ev, fn) {
      if (!_listeners[ev]) _listeners[ev] = [];
      _listeners[ev].push(fn);
    },
    off: function(ev, fn) {
      if (!_listeners[ev]) return;
      _listeners[ev] = _listeners[ev].filter(function(f){ return f !== fn; });
    },
    emit: function(ev, data) {
      (_listeners[ev] || []).forEach(function(fn){
        try { fn(data); } catch(e) { console.error('[HRdb] Listener error em ' + ev, e); }
      });
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // MÓDULO BASE — fábrica de módulos CRUD
  // ══════════════════════════════════════════════════════════════════
  // Cada módulo criado por _makeModule() tem:
  //   .listar(filtro?)     → array (clone)
  //   .buscar(id)          → objeto | null
  //   .criar(dados)        → objeto criado
  //   .atualizar(id,patch) → objeto atualizado | null
  //   .remover(id)         → boolean
  //   .count()             → número de registros
  //   .limpar()            → remove todos (⚠️ use com cuidado)
  //   ._raw()              → referência direta (somente leitura interna)

  function _makeModule(name, defaults, validators) {
    var _data = _load(name, []);

    function _persist() {
      var ok = _save(name, _data);
      _bus.emit(name + ':changed', { module: name, count: _data.length });
      return ok;
    }

    return {

      /** Lista todos os registros, com filtro opcional.
       *  filtro: função(item) → boolean
       *  ou objeto { campo: valor } para match simples
       */
      listar: function(filtro) {
        var arr = _clone(_data);
        if (!filtro) return arr;
        if (typeof filtro === 'function') return arr.filter(filtro);
        // filtro por objeto
        return arr.filter(function(item) {
          return Object.keys(filtro).every(function(k) {
            return item[k] === filtro[k];
          });
        });
      },

      /** Busca por ID */
      buscar: function(id) {
        var item = _data.find(function(x){ return x.id === id; });
        return item ? _clone(item) : null;
      },

      /** Cria novo registro.
       *  dados: objeto com os campos do modelo
       *  Retorna o objeto criado (com id gerado)
       */
      criar: function(dados) {
        if (validators && validators.criar) validators.criar(dados);
        var agora = new Date().toISOString();
        var item = Object.assign({}, defaults || {}, dados, {
          id: dados.id || _uid(name.slice(0, 3)),
          _criado: agora,
          _atualizado: agora
        });
        _data.unshift(item);       // mais recente primeiro
        _persist();
        _bus.emit(name + ':criado', _clone(item));
        return _clone(item);
      },

      /** Atualiza campos de um registro existente.
       *  patch: objeto parcial com campos a modificar
       */
      atualizar: function(id, patch) {
        var idx = _data.findIndex(function(x){ return x.id === id; });
        if (idx < 0) return null;
        if (validators && validators.atualizar) validators.atualizar(patch);
        Object.assign(_data[idx], patch, {
          _atualizado: new Date().toISOString()
        });
        _persist();
        _bus.emit(name + ':atualizado', _clone(_data[idx]));
        return _clone(_data[idx]);
      },

      /** Remove por ID. Retorna true se encontrou e removeu */
      remover: function(id) {
        var antes = _data.length;
        _data = _data.filter(function(x){ return x.id !== id; });
        if (_data.length === antes) return false;
        _persist();
        _bus.emit(name + ':removido', { id: id });
        return true;
      },

      /** Contagem total */
      count: function() { return _data.length; },

      /** Limpa todos os dados do módulo */
      limpar: function() {
        _data = [];
        _remove(name);
        _bus.emit(name + ':limpo', { module: name });
      },

      /** Acesso interno à referência — NÃO usar externamente */
      _raw: function() { return _data; },

      /** Força reload do localStorage (útil após sync externo) */
      _reload: function() {
        _data = _load(name, []);
      },

      /** Exporta snapshot JSON */
      exportar: function() {
        return { modulo: name, versao: _VER, dados: _clone(_data), exportado: new Date().toISOString() };
      },

      /** Importa snapshot (merge ou substituição) */
      importar: function(snapshot, modo) {
        // modo: 'merge' (padrão) ou 'substituir'
        if (!snapshot || !Array.isArray(snapshot.dados)) {
          throw new Error('[HRdb] Snapshot inválido para ' + name);
        }
        if (modo === 'substituir') {
          _data = snapshot.dados;
        } else {
          // merge: só adiciona IDs que não existem
          var existentes = new Set(_data.map(function(x){ return x.id; }));
          snapshot.dados.forEach(function(item) {
            if (!existentes.has(item.id)) _data.push(item);
          });
        }
        _persist();
      }
    };
  }


  // ══════════════════════════════════════════════════════════════════
  // MODELS — definição de campos padrão e validadores por módulo
  // ══════════════════════════════════════════════════════════════════

  // ── CLIENTES ──────────────────────────────────────────────────────
  //  Representa pessoas físicas ou jurídicas que solicitaram orçamento
  //  ou serviço. Pode ser criado automaticamente ao salvar orçamento.

  var _clienteDefaults = {
    nome:       '',          // nome completo
    tel:        '',          // telefone principal
    tel2:       '',          // telefone secundário (opcional)
    cidade:     '',          // cidade
    bairro:     '',          // bairro (opcional)
    end:        '',          // endereço completo (opcional)
    tipo:       'pf',        // 'pf' | 'pj'
    cpfCnpj:    '',          // CPF ou CNPJ (opcional)
    email:      '',          // e-mail (opcional)
    obs:        '',          // observações livres
    tags:       [],          // ex: ['vip', 'recorrente']
    ativo:      true,
    // Métricas calculadas (não editar manualmente):
    totalGasto:     0,       // soma de todos os serviços pagos
    qtdOrcamentos:  0,       // quantos orçamentos foram gerados
    qtdServicos:    0,       // quantos serviços concluídos
    ultimoContato:  '',      // data YYYY-MM-DD
  };

  var _clienteValidators = {
    criar: function(d) {
      if (!d.nome || !d.nome.trim()) throw new Error('Cliente: nome é obrigatório');
    }
  };

  // ── ORÇAMENTOS ────────────────────────────────────────────────────
  //  Snapshot do cálculo gerado — migrado conceitualmente de DB.q
  //  Adiciona clienteId como link para o módulo de clientes.

  var _orcamentoDefaults = {
    clienteId:  '',          // referência para HRdb.clientes
    // Dados do cliente no momento (snapshot, não sofre se cliente mudar)
    cli:        '',          // nome do cliente (legado: compatível com DB.q)
    tel:        '',
    cidade:     '',
    end:        '',
    obs:        '',
    // Materiais e cálculo
    tipo:       '',          // tipo de ambiente ex: 'Cozinha+Banheiro'
    mat:        '',          // nome da pedra
    matId:      '',          // id da pedra no CFG
    matPr:      0,           // preço/m² na época
    m2:         0,           // metros quadrados totais
    ambSnap:    [],          // snapshot dos ambientes (legado compat)
    // Valores
    pedT:       0,           // total pedra
    acT:        0,           // total acessórios
    vista:      0,           // total à vista
    parc:       0,           // total parcelado
    p8:         0,           // total em 8x
    ent:        0,           // entrada (50%)
    // Status
    status:     'pendente',  // 'pendente' | 'aprovado' | 'recusado' | 'expirado'
    // Vínculo com agenda/serviço
    agendaId:   '',          // se virou serviço, referência HRdb.agenda
    servicoId:  '',          // referência HRdb.servicos
    // Metadados
    date:       '',          // data geração YYYY-MM-DD (legado: td())
    textoCopia: '',          // texto gerado para WhatsApp/PDF
    pdfGerado:  false,
  };

  // ── SERVIÇOS ──────────────────────────────────────────────────────
  //  Catálogo de trabalhos da empresa — cada serviço é um tipo
  //  de trabalho que pode ser orçado, agendado e cobrado.
  //  NÃO confundir com CFG.svList (que são os acabamentos/preços).
  //  Este módulo representa "trabalhos/projetos" realizados.

  var _servicoDefaults = {
    clienteId:  '',          // link para cliente
    orcamentoId:'',          // link para orçamento de origem
    agendaId:   '',          // link para item de agenda
    // Descrição
    titulo:     '',          // ex: "Bancada cozinha — Mármore Branco"
    tipo:       '',          // ex: "Cozinha", "Banheiro", "Soleira"
    pedra:      '',          // nome da pedra utilizada
    pedraId:    '',          // id pedra
    ambientes:  [],          // snapshot dos ambientes
    m2:         0,
    // Financeiro
    valorTotal: 0,
    valorPago:  0,
    valorRest:  function(){ return this.valorTotal - this.valorPago; }, // não serializa
    // Datas
    dataInicio: '',
    dataEntrega:'',
    dataConcluido: '',
    // Status
    status:     'pendente',  // 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
    prioridade: 'normal',    // 'baixa' | 'normal' | 'alta' | 'urgente'
    // Equipe
    funcionarioIds: [],      // referências para HRdb.funcionarios
    // Observações
    obs:        '',
    fotos:      [],          // URLs de fotos do serviço (base64 ou path)
  };

  var _servicoValidators = {
    criar: function(d) {
      if (!d.titulo && !d.tipo) throw new Error('Serviço: informe título ou tipo');
    }
  };

  // ── AGENDA ────────────────────────────────────────────────────────
  //  Agendamentos de serviços — migrado conceitualmente de DB.j
  //  Cada item representa um período de produção/entrega.

  var _agendaDefaults = {
    clienteId:  '',          // link para cliente
    servicoId:  '',          // link para serviço
    orcamentoId:'',          // link para orçamento
    // Dados de exibição (snapshot — legado compat com DB.j)
    cli:        '',          // nome cliente
    desc:       '',          // descrição do serviço
    // Datas
    start:      '',          // YYYY-MM-DD
    end:        '',          // YYYY-MM-DD previsto
    dataReal:   '',          // YYYY-MM-DD real de conclusão
    // Financeiro
    value:      0,           // valor total do serviço
    pago:       0,           // valor já pago
    // Status
    done:       false,       // concluído?
    status:     'agendado',  // 'agendado'|'em_producao'|'pronto'|'entregue'|'cancelado'
    prioridade: 'normal',
    // Equipe e logística
    funcionarioIds: [],
    local:      '',          // local de instalação
    // Observações
    obs:        '',
    alertas:    [],          // ex: [{tipo:'prazo', msg:'Entrega em 2 dias'}]
  };

  // ── FINANCEIRO ────────────────────────────────────────────────────
  //  Transações financeiras — migrado conceitualmente de DB.t
  //  Adiciona categorias, vínculos e controle mais detalhado.

  var _financeiroDefaults = {
    // Tipo e categoria
    type:       'in',        // 'in'|'out'|'note'|'pending' (legado compat)
    categoria:  '',          // 'material'|'mao_de_obra'|'despesa_fixa'|'venda'|'outros'
    subcategoria: '',        // livre, ex: 'água', 'energia', 'pedra'
    // Descrição e valor
    desc:       '',
    value:      0,
    // Datas
    date:       '',          // YYYY-MM-DD (legado compat)
    dataVencimento: '',      // para contas a pagar
    dataPagamento:  '',      // data efetiva do pagamento
    // Vínculos
    clienteId:  '',
    servicoId:  '',
    agendaId:   '',
    orcamentoId:'',
    funcionarioId: '',
    // Recorrência
    recorrente: false,
    periodicidade: '',       // 'mensal'|'semanal'|'anual'
    // Comprovante
    comprovante: '',         // base64 ou URL
    // Estado
    status:     'confirmado', // 'confirmado'|'pendente'|'cancelado'
    formaPagamento: '',      // 'dinheiro'|'pix'|'cartao'|'boleto'
    observacoes: '',
  };

  var _financeiroValidators = {
    criar: function(d) {
      if (!d.desc || !d.desc.trim()) throw new Error('Financeiro: descrição é obrigatória');
      if (d.value === undefined || d.value === null) throw new Error('Financeiro: valor é obrigatório');
    }
  };

  // ── FUNCIONÁRIOS ──────────────────────────────────────────────────
  //  Equipe interna — marmoristas, instaladores, vendedores.

  var _funcionarioDefaults = {
    nome:       '',
    apelido:    '',          // nome de chamada
    funcao:     '',          // 'marmorista'|'instalador'|'vendedor'|'admin'|'outro'
    tel:        '',
    tel2:       '',
    cpf:        '',
    pix:        '',
    salarioBase: 0,          // se mensalista
    tipoComissao: 'nenhuma', // 'nenhuma'|'porcentagem'|'fixo_por_servico'
    comissao:   0,           // % ou valor fixo
    dataAdmissao: '',        // YYYY-MM-DD
    ativo:      true,
    obs:        '',
    foto:       '',
    // Métricas calculadas:
    totalServicos: 0,        // qtd de serviços participados
    totalRecebido: 0,        // total pago a este funcionário
  };

  var _funcionarioValidators = {
    criar: function(d) {
      if (!d.nome || !d.nome.trim()) throw new Error('Funcionário: nome é obrigatório');
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // INSTÂNCIAS DOS MÓDULOS
  // ══════════════════════════════════════════════════════════════════

  var clientes    = _makeModule('clientes',    _clienteDefaults,    _clienteValidators);
  var orcamentos  = _makeModule('orcamentos',  _orcamentoDefaults,  null);
  var servicos    = _makeModule('servicos',    _servicoDefaults,    _servicoValidators);
  var agenda      = _makeModule('agenda',      _agendaDefaults,     null);
  var financeiro  = _makeModule('financeiro',  _financeiroDefaults, _financeiroValidators);
  var funcionarios= _makeModule('funcionarios',_funcionarioDefaults,_funcionarioValidators);


  // ══════════════════════════════════════════════════════════════════
  // BRIDGE — ponte de compatibilidade com DB legado (DB.q / DB.j / DB.t)
  // ══════════════════════════════════════════════════════════════════
  // Permite usar HRdb sem quebrar o sistema antigo.
  // O DB antigo continua funcionando normalmente.
  // A bridge sincroniza dados novos ↔ antigos quando necessário.

  var BRIDGE = {

    /** Importa DB.q (orçamentos antigos) para HRdb.orcamentos.
     *  Só adiciona os que ainda não existem (por id).
     *  Chame uma vez após carregar o sistema.
     */
    importarOrcamentosLegado: function() {
      if (typeof DB === 'undefined' || !DB.q) return 0;
      var existentes = new Set(orcamentos._raw().map(function(x){ return x.id; }));
      var importados = 0;
      DB.q.forEach(function(q) {
        var idStr = String(q.id);
        if (existentes.has(idStr) || existentes.has(q.id)) return;
        var novo = Object.assign({}, _orcamentoDefaults, q, {
          id: idStr,
          _legado: true,         // marcado como vindo do sistema antigo
          date: q.date || _hoje()
        });
        orcamentos._raw().unshift(novo);
        importados++;
      });
      if (importados > 0) {
        _save('orcamentos', orcamentos._raw());
        console.log('[HRdb Bridge] ' + importados + ' orçamento(s) legado(s) importado(s)');
      }
      return importados;
    },

    /** Importa DB.j (agenda antiga) para HRdb.agenda */
    importarAgendaLegado: function() {
      if (typeof DB === 'undefined' || !DB.j) return 0;
      var existentes = new Set(agenda._raw().map(function(x){ return x.id; }));
      var importados = 0;
      DB.j.forEach(function(j) {
        var idStr = String(j.id);
        if (existentes.has(idStr) || existentes.has(j.id)) return;
        var novo = Object.assign({}, _agendaDefaults, j, {
          id: idStr,
          _legado: true,
          status: j.done ? 'entregue' : 'agendado'
        });
        agenda._raw().unshift(novo);
        importados++;
      });
      if (importados > 0) {
        _save('agenda', agenda._raw());
        console.log('[HRdb Bridge] ' + importados + ' agendamento(s) legado(s) importado(s)');
      }
      return importados;
    },

    /** Importa DB.t (transações antigas) para HRdb.financeiro */
    importarFinanceiroLegado: function() {
      if (typeof DB === 'undefined' || !DB.t) return 0;
      var existentes = new Set(financeiro._raw().map(function(x){ return x.id; }));
      var importados = 0;
      DB.t.forEach(function(t) {
        var idStr = String(t.id);
        if (existentes.has(idStr) || existentes.has(t.id)) return;
        var novo = Object.assign({}, _financeiroDefaults, t, {
          id: idStr,
          _legado: true,
          categoria: t.type === 'out' ? 'despesa' : 'venda',
          status: 'confirmado',
          date: t.date || _hoje()
        });
        financeiro._raw().unshift(novo);
        importados++;
      });
      if (importados > 0) {
        _save('financeiro', financeiro._raw());
        console.log('[HRdb Bridge] ' + importados + ' transação(ões) legada(s) importada(s)');
      }
      return importados;
    },

    /** Executa toda a migração de uma vez */
    migrarTudo: function() {
      var total = 0;
      total += this.importarOrcamentosLegado();
      total += this.importarAgendaLegado();
      total += this.importarFinanceiroLegado();
      if (total > 0) {
        console.log('[HRdb Bridge] Migração concluída: ' + total + ' registro(s) total');
      }
      return total;
    },

    /** Sincroniza de volta ao DB legado.
     *  Útil para garantir que ações no novo sistema reflitam no antigo.
     *  (Mantém sistema antigo funcionando durante transição)
     */
    sincronizarParaLegado: function() {
      if (typeof DB === 'undefined') return;
      // Orçamentos novos → DB.q
      var orcNovos = orcamentos.listar(function(o){ return !o._legado; });
      orcNovos.forEach(function(o) {
        var existe = DB.q.find(function(q){ return String(q.id) === String(o.id); });
        if (!existe) DB.q.unshift(o);
      });
      // Agenda novos → DB.j
      var agNovos = agenda.listar(function(a){ return !a._legado; });
      agNovos.forEach(function(a) {
        var existe = DB.j.find(function(j){ return String(j.id) === String(a.id); });
        if (!existe) DB.j.unshift(a);
      });
      // Financeiro novos → DB.t
      var finNovos = financeiro.listar(function(f){ return !f._legado; });
      finNovos.forEach(function(f) {
        var existe = DB.t.find(function(t){ return String(t.id) === String(f.id); });
        if (!existe) DB.t.unshift(f);
      });
      if (typeof DB.sv === 'function') DB.sv();
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // FUNÇÕES DE NEGÓCIO INTER-MÓDULOS
  // ══════════════════════════════════════════════════════════════════
  // Funções que precisam de mais de um módulo para operar.

  var negocio = {

    /**
     * Criar orçamento completo com cliente automático.
     * Se o cliente não existir (por tel), cria; se existir, vincula.
     * Retorna { cliente, orcamento }
     */
    criarOrcamentoComCliente: function(dados) {
      // dados: { cli, tel, cidade, end, obs, ... todos campos de orçamento }
      var cliente = null;

      if (dados.tel) {
        // Busca cliente por telefone
        var encontrados = clientes.listar(function(c){
          return c.tel === dados.tel || c.tel2 === dados.tel;
        });
        cliente = encontrados[0] || null;
      }

      if (!cliente && dados.cli) {
        // Cria novo cliente
        cliente = clientes.criar({
          nome:     dados.cli,
          tel:      dados.tel || '',
          cidade:   dados.cidade || '',
          end:      dados.end || '',
          obs:      dados.obs || '',
          ultimoContato: _hoje()
        });
      } else if (cliente) {
        // Atualiza último contato
        clientes.atualizar(cliente.id, {
          ultimoContato: _hoje(),
          qtdOrcamentos: (cliente.qtdOrcamentos || 0) + 1
        });
      }

      // Cria orçamento com vínculo
      var orc = orcamentos.criar(Object.assign({}, dados, {
        clienteId: cliente ? cliente.id : '',
        date: dados.date || _hoje()
      }));

      return { cliente: cliente, orcamento: orc };
    },

    /**
     * Converter orçamento em serviço + agenda.
     * Cria serviço, cria agendamento, vincula todos.
     * Retorna { servico, agendamento }
     */
    aprovarOrcamento: function(orcId, opcoes) {
      // opcoes: { inicio, prazo, funcionarioIds, obs }
      var orc = orcamentos.buscar(orcId);
      if (!orc) throw new Error('Orçamento não encontrado: ' + orcId);

      var inicio = (opcoes && opcoes.inicio) || _hoje();
      var prazo  = (opcoes && opcoes.prazo)  || '';

      // Cria serviço
      var srv = servicos.criar({
        clienteId:   orc.clienteId,
        orcamentoId: orc.id,
        titulo:      (orc.tipo || 'Serviço') + ' — ' + (orc.mat || ''),
        tipo:        orc.tipo || '',
        pedra:       orc.mat || '',
        pedraId:     orc.matId || '',
        ambientes:   orc.ambSnap || [],
        m2:          orc.m2 || 0,
        valorTotal:  orc.vista || 0,
        valorPago:   0,
        dataInicio:  inicio,
        dataEntrega: prazo,
        status:      'em_producao',
        funcionarioIds: (opcoes && opcoes.funcionarioIds) || [],
        obs:         (opcoes && opcoes.obs) || orc.obs || '',
      });

      // Cria agendamento
      var ag = agenda.criar({
        clienteId:   orc.clienteId,
        servicoId:   srv.id,
        orcamentoId: orc.id,
        cli:         orc.cli,
        desc:        srv.titulo,
        start:       inicio,
        end:         prazo,
        value:       orc.vista || 0,
        pago:        0,
        done:        false,
        status:      'em_producao',
        obs:         (opcoes && opcoes.obs) || '',
      });

      // Atualiza vínculos
      servicos.atualizar(srv.id,  { agendaId:    ag.id  });
      orcamentos.atualizar(orc.id, {
        status:    'aprovado',
        agendaId:  ag.id,
        servicoId: srv.id
      });

      // Atualiza métricas do cliente
      if (orc.clienteId) {
        var cli = clientes.buscar(orc.clienteId);
        if (cli) {
          clientes.atualizar(cli.id, {
            qtdServicos: (cli.qtdServicos || 0) + 1
          });
        }
      }

      // Sincroniza agendamento para o DB legado
      if (typeof DB !== 'undefined' && DB.j) {
        DB.j.unshift({
          id:    ag.id,
          cli:   ag.cli,
          desc:  ag.desc,
          start: ag.start,
          end:   ag.end,
          value: ag.value,
          pago:  ag.pago,
          obs:   ag.obs,
          done:  ag.done
        });
        if (typeof DB.sv === 'function') DB.sv();
      }

      return { servico: srv, agendamento: ag };
    },

    /**
     * Registrar pagamento de serviço.
     * Cria transação financeira e atualiza agenda/serviço.
     */
    registrarPagamento: function(servicoId, valor, opcoes) {
      // opcoes: { tipo ('entrada'|'restante'|'parcial'), forma, obs, data }
      var srv = servicos.buscar(servicoId);
      if (!srv) throw new Error('Serviço não encontrado: ' + servicoId);

      var tipo  = (opcoes && opcoes.tipo) || 'parcial';
      var forma = (opcoes && opcoes.forma) || '';
      var data  = (opcoes && opcoes.data) || _hoje();
      var cli   = clientes.buscar(srv.clienteId);

      // Cria transação
      var tr = financeiro.criar({
        type:        'in',
        categoria:   'venda',
        desc:        tipo.charAt(0).toUpperCase() + tipo.slice(1) + ' — ' + (cli ? cli.nome : srv.titulo),
        value:       valor,
        date:        data,
        dataPagamento: data,
        clienteId:   srv.clienteId,
        servicoId:   srv.id,
        agendaId:    srv.agendaId,
        orcamentoId: srv.orcamentoId,
        formaPagamento: forma,
        status:      'confirmado',
        observacoes: (opcoes && opcoes.obs) || '',
      });

      // Atualiza serviço
      var novoPago = (srv.valorPago || 0) + valor;
      var servicoAtualizado = servicos.atualizar(srv.id, {
        valorPago: novoPago,
        status: novoPago >= srv.valorTotal ? 'entregue' : srv.status
      });

      // Atualiza agenda vinculada
      if (srv.agendaId) {
        var ag = agenda.buscar(srv.agendaId);
        if (ag) {
          var agPago = (ag.pago || 0) + valor;
          agenda.atualizar(ag.id, {
            pago: agPago,
            done: agPago >= ag.value
          });
          // Sincroniza para DB.j legado
          if (typeof DB !== 'undefined' && DB.j) {
            var jLeg = DB.j.find(function(j){ return String(j.id) === String(ag.id); });
            if (jLeg) {
              jLeg.pago = agPago;
              jLeg.done = agPago >= ag.value;
              if (typeof DB.sv === 'function') DB.sv();
            }
          }
        }
      }

      // Atualiza métricas do cliente
      if (srv.clienteId) {
        var cliAtual = clientes.buscar(srv.clienteId);
        if (cliAtual) {
          clientes.atualizar(cliAtual.id, {
            totalGasto: (cliAtual.totalGasto || 0) + valor
          });
        }
      }

      // Sincroniza para DB.t legado
      if (typeof DB !== 'undefined' && DB.t) {
        DB.t.unshift({
          id:    tr.id,
          type:  'in',
          desc:  tr.desc,
          value: tr.value,
          date:  tr.date
        });
        if (typeof DB.sv === 'function') DB.sv();
      }

      return { transacao: tr, servico: servicoAtualizado };
    },

    /**
     * Concluir serviço.
     * Marca como entregue, atualiza todos os vínculos.
     */
    concluirServico: function(servicoId, dataReal) {
      var srv = servicos.buscar(servicoId);
      if (!srv) throw new Error('Serviço não encontrado: ' + servicoId);

      var data = dataReal || _hoje();
      servicos.atualizar(srv.id, { status: 'entregue', dataConcluido: data });

      if (srv.agendaId) {
        agenda.atualizar(srv.agendaId, { done: true, dataReal: data, status: 'entregue' });
        // Sync legado
        if (typeof DB !== 'undefined' && DB.j) {
          var jLeg = DB.j.find(function(j){ return String(j.id) === String(srv.agendaId); });
          if (jLeg) { jLeg.done = true; if (typeof DB.sv === 'function') DB.sv(); }
        }
      }

      return servicos.buscar(srv.id);
    },


    // ── RELATÓRIOS / CONSULTAS CRUZADAS ────────────────────────────

    /**
     * Dashboard financeiro consolidado.
     * Retorna métricas do período informado (ou tudo se sem filtro).
     */
    dashboardFinanceiro: function(filtro) {
      // filtro: { dataInicio, dataFim } — YYYY-MM-DD
      var todos = financeiro.listar();

      if (filtro && filtro.dataInicio) {
        todos = todos.filter(function(t){ return t.date >= filtro.dataInicio; });
      }
      if (filtro && filtro.dataFim) {
        todos = todos.filter(function(t){ return t.date <= filtro.dataFim; });
      }

      var entradas = todos.filter(function(t){ return t.type === 'in'; });
      var saidas   = todos.filter(function(t){ return t.type === 'out'; });

      var totalEntradas = entradas.reduce(function(s,t){ return s + (t.value || 0); }, 0);
      var totalSaidas   = saidas.reduce(function(s,t){ return s + (t.value || 0); }, 0);

      var aReceber = agenda.listar(function(a){ return !a.done; })
        .reduce(function(s,a){ return s + Math.max(0, (a.value||0) - (a.pago||0)); }, 0);

      return {
        entradas:     totalEntradas,
        saidas:       totalSaidas,
        saldo:        totalEntradas - totalSaidas,
        aReceber:     aReceber,
        qtdEntradas:  entradas.length,
        qtdSaidas:    saidas.length,
        periodo:      filtro || 'total',
        geradoEm:     new Date().toISOString()
      };
    },

    /**
     * Resumo de um cliente: orçamentos, serviços, pagamentos.
     */
    resumoCliente: function(clienteId) {
      var cli   = clientes.buscar(clienteId);
      if (!cli) return null;

      var orcs  = orcamentos.listar({ clienteId: clienteId });
      var srvs  = servicos.listar(  { clienteId: clienteId });
      var fins  = financeiro.listar({ clienteId: clienteId });
      var ags   = agenda.listar(    { clienteId: clienteId });

      var totalPago = fins.filter(function(f){ return f.type === 'in'; })
        .reduce(function(s,f){ return s + (f.value || 0); }, 0);

      return {
        cliente:       cli,
        orcamentos:    orcs,
        servicos:      srvs,
        agenda:        ags,
        transacoes:    fins,
        totalPago:     totalPago,
        srvPendentes:  srvs.filter(function(s){ return s.status !== 'entregue' && s.status !== 'cancelado'; }).length,
        srvConcluidos: srvs.filter(function(s){ return s.status === 'entregue'; }).length,
      };
    },

    /**
     * Busca global — pesquisa em clientes, orçamentos e serviços.
     */
    buscarGlobal: function(termo) {
      if (!termo || !termo.trim()) return { clientes: [], orcamentos: [], servicos: [] };
      var t = termo.toLowerCase();
      return {
        clientes:   clientes.listar(function(c){
          return (c.nome||'').toLowerCase().includes(t) || (c.tel||'').includes(t);
        }),
        orcamentos: orcamentos.listar(function(o){
          return (o.cli||'').toLowerCase().includes(t) || (o.mat||'').toLowerCase().includes(t);
        }),
        servicos:   servicos.listar(function(s){
          return (s.titulo||'').toLowerCase().includes(t);
        }),
      };
    },

    /**
     * Agenda da semana (próximos 7 dias).
     */
    agendaSemana: function() {
      var hoje  = _hoje();
      var fim   = _addDias(hoje, 7);
      return agenda.listar(function(a){
        return !a.done && a.end >= hoje && a.end <= fim;
      }).sort(function(a,b){ return a.end < b.end ? -1 : 1; });
    },

    /**
     * Serviços em atraso (end < hoje e !done).
     */
    servicosAtrasados: function() {
      var hoje = _hoje();
      return agenda.listar(function(a){
        return !a.done && a.end && a.end < hoje;
      }).sort(function(a,b){ return a.end < b.end ? -1 : 1; });
    },

  };

  // Helper interno: soma dias a data YYYY-MM-DD
  function _addDias(dataStr, dias) {
    var d = new Date(dataStr + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-'
      + String(d.getMonth()+1).padStart(2,'0') + '-'
      + String(d.getDate()).padStart(2,'0');
  }


  // ══════════════════════════════════════════════════════════════════
  // SINCRONIZAÇÃO PREPARADA — interface para Firebase / Supabase
  // ══════════════════════════════════════════════════════════════════
  // O sistema antigo usa Firebase Realtime DB via SYNC.
  // O HRdb.sync expõe hooks para conectar qualquer backend.

  var sync = {
    _adaptador: null,   // adaptador plugável (Firebase, Supabase, etc.)

    /** Registra adaptador de sync.
     *  adaptador: { push(payload), pull(callback), listen(callback) }
     */
    registrar: function(adaptador) {
      this._adaptador = adaptador;
      console.log('[HRdb Sync] Adaptador registrado');
    },

    /** Exporta todos os dados para push */
    exportarTudo: function() {
      return {
        versao:      _VER,
        clientes:    clientes.exportar(),
        orcamentos:  orcamentos.exportar(),
        servicos:    servicos.exportar(),
        agenda:      agenda.exportar(),
        financeiro:  financeiro.exportar(),
        funcionarios:funcionarios.exportar(),
        _ts:         Date.now()
      };
    },

    /** Importa snapshot recebido do backend */
    importarTudo: function(snapshot, modo) {
      if (!snapshot) return;
      modo = modo || 'merge';
      if (snapshot.clientes)    clientes.importar(snapshot.clientes, modo);
      if (snapshot.orcamentos)  orcamentos.importar(snapshot.orcamentos, modo);
      if (snapshot.servicos)    servicos.importar(snapshot.servicos, modo);
      if (snapshot.agenda)      agenda.importar(snapshot.agenda, modo);
      if (snapshot.financeiro)  financeiro.importar(snapshot.financeiro, modo);
      if (snapshot.funcionarios)funcionarios.importar(snapshot.funcionarios, modo);
      _bus.emit('sync:importado', { ts: snapshot._ts });
    },

    /** Push manual para o adaptador registrado */
    push: function() {
      if (!this._adaptador || !this._adaptador.push) return;
      this._adaptador.push(this.exportarTudo());
    },

    /** Pull manual do adaptador */
    pull: function(callback) {
      if (!this._adaptador || !this._adaptador.pull) return;
      var self = this;
      this._adaptador.pull(function(snapshot) {
        self.importarTudo(snapshot);
        if (typeof callback === 'function') callback(snapshot);
      });
    },

    /** Adaptador pré-configurado para o Firebase existente (SYNC legado) */
    adaptadorFirebaseLegado: {
      push: function(payload) {
        if (typeof SYNC !== 'undefined' && SYNC.on && SYNC.db && SYNC.code) {
          SYNC.db.ref('hr_new/' + SYNC.code).set(payload);
        }
      },
      pull: function(callback) {
        if (typeof SYNC !== 'undefined' && SYNC.on && SYNC.db && SYNC.code) {
          SYNC.db.ref('hr_new/' + SYNC.code).once('value', function(snap){
            callback(snap.val());
          });
        }
      }
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // AUTO-EVENTOS — reações automáticas entre módulos
  // ══════════════════════════════════════════════════════════════════

  // Quando um novo orçamento é criado via DB.q antigo → opcional auto-import
  // (desativado por padrão, ativar com HRdb.autoSync = true)

  _bus.on('orcamentos:criado', function(orc) {
    if (!HRdb.autoSync) return;
    sync.push();
  });

  _bus.on('agenda:criado', function(ag) {
    if (!HRdb.autoSync) return;
    sync.push();
  });

  _bus.on('financeiro:criado', function(tr) {
    if (!HRdb.autoSync) return;
    sync.push();
  });


  // ══════════════════════════════════════════════════════════════════
  // API PÚBLICA — HRdb
  // ══════════════════════════════════════════════════════════════════

  var HRdb = {
    // ── Módulos ────────────────────────────────────────────────────
    clientes:      clientes,
    orcamentos:    orcamentos,
    servicos:      servicos,
    agenda:        agenda,
    financeiro:    financeiro,
    funcionarios:  funcionarios,

    // ── Negócio ────────────────────────────────────────────────────
    negocio:       negocio,

    // ── Compatibilidade ────────────────────────────────────────────
    bridge:        BRIDGE,

    // ── Sincronização ──────────────────────────────────────────────
    sync:          sync,

    // ── Eventos ────────────────────────────────────────────────────
    on:            _bus.on.bind(_bus),
    off:           _bus.off.bind(_bus),
    emit:          _bus.emit.bind(_bus),

    // ── Configuração ───────────────────────────────────────────────
    autoSync:      false,    // ativar para push automático após cada operação
    versao:        _VER,

    // ── Utilitários ────────────────────────────────────────────────
    utils: {
      uid:    _uid,
      hoje:   _hoje,
      clone:  _clone,
    },

    /** Inicialização — chamar uma vez após DOM ready.
     *  Faz a bridge de migração de dados legados.
     *  opcoes: { migrar: true, autoSync: false }
     */
    init: function(opcoes) {
      opcoes = opcoes || {};
      this.autoSync = opcoes.autoSync || false;

      if (opcoes.migrar !== false) {
        // Aguarda DB estar disponível (carregado de data-defaults.js)
        setTimeout(function(){
          var total = BRIDGE.migrarTudo();
          if (total > 0) {
            console.log('[HRdb] Init: ' + total + ' registro(s) migrado(s) do sistema legado.');
          }
          _bus.emit('hrdb:pronto', { migrados: total });
        }, 100);
      } else {
        setTimeout(function(){ _bus.emit('hrdb:pronto', { migrados: 0 }); }, 50);
      }

      // Registra adaptador Firebase legado automaticamente se disponível
      if (opcoes.usarFirebaseLegado !== false) {
        sync.registrar(sync.adaptadorFirebaseLegado);
      }

      console.log('[HRdb] v' + _VER + ' inicializado — módulos: clientes, orcamentos, servicos, agenda, financeiro, funcionarios');
      return this;
    },

    /** Diagnóstico — retorna contagem de registros por módulo */
    status: function() {
      return {
        versao:        _VER,
        clientes:      clientes.count(),
        orcamentos:    orcamentos.count(),
        servicos:      servicos.count(),
        agenda:        agenda.count(),
        financeiro:    financeiro.count(),
        funcionarios:  funcionarios.count(),
        autoSync:      this.autoSync,
        geradoEm:      new Date().toISOString()
      };
    },

    /** Exportação completa para backup JSON */
    exportarBackup: function() {
      var payload = sync.exportarTudo();
      payload._backup = true;
      return JSON.stringify(payload, null, 2);
    },

    /** Restaurar a partir de backup JSON */
    restaurarBackup: function(jsonStr) {
      var snapshot = JSON.parse(jsonStr);
      sync.importarTudo(snapshot, 'substituir');
      return this.status();
    }
  };

  // Expõe globalmente
  global.HRdb = HRdb;

})(window);


// ══════════════════════════════════════════════════════════════════
// INSTRUÇÕES DE USO
// ══════════════════════════════════════════════════════════════════
//
// 1. ADICIONAR NO index.html (após data-defaults.js, antes de app-init.js):
//    <script src="hr-db-core.js"></script>
//
// 2. INICIALIZAR (no final do DOMContentLoaded, em app-init.js):
//    HRdb.init({ migrar: true, autoSync: false });
//
// 3. EXEMPLOS DE USO:
//
//    // Criar cliente
//    var cli = HRdb.clientes.criar({ nome: 'João Silva', tel: '74991234567' });
//
//    // Criar orçamento e vincular cliente automaticamente
//    var res = HRdb.negocio.criarOrcamentoComCliente({
//      cli: 'Maria Santos', tel: '74991234567', cidade: 'Pilão Arcado',
//      mat: 'Branco Dallas', vista: 2800, ent: 1400
//    });
//    // res.cliente, res.orcamento
//
//    // Aprovar orçamento → vira serviço + agenda
//    var aprovado = HRdb.negocio.aprovarOrcamento(res.orcamento.id, {
//      inicio: '2025-05-10', prazo: '2025-05-15'
//    });
//    // aprovado.servico, aprovado.agendamento
//
//    // Registrar pagamento
//    HRdb.negocio.registrarPagamento(aprovado.servico.id, 1400, {
//      tipo: 'entrada', forma: 'pix'
//    });
//
//    // Dashboard financeiro
//    var dash = HRdb.negocio.dashboardFinanceiro({ dataInicio: '2025-05-01' });
//    // dash.entradas, dash.saidas, dash.saldo, dash.aReceber
//
//    // Status do DB
//    console.log(HRdb.status());
//
//    // Escutar eventos
//    HRdb.on('financeiro:criado', function(tr){ console.log('Nova transação:', tr); });
//    HRdb.on('hrdb:pronto', function(info){ console.log('HRdb pronto!', info); });
//
// ══════════════════════════════════════════════════════════════════
