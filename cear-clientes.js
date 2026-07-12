// ════════════════════════════════════════════════════════════
// CLIENTES — CRM real com IndexedDB
// ════════════════════════════════════════════════════════════

let cliState = {
  lista: [],
  busca: '',
  expandido: null,
  modo: 'lista',      // 'lista' | 'form'
  editando: null,     // cliente obj sendo editado (null = novo)
  carregando: true,
};

// ── Render principal ──────────────────────────────────────────
function renderClientes(wrap) {
  wrap.style.padding = '0';
  wrap.innerHTML = `<div class="hist-wrap" id="cliWrap">
    <div class="hist-head">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="hist-titulo">👥 Clientes</div>
        <button class="btn btn-gold btn-sm" id="cliBtnNovo" onclick="cliAbrirForm(null)">+ Novo</button>
      </div>
      <div class="hist-busca">
        <span class="hist-busca-ic">🔍</span>
        <input id="cliBuscaInput" value="${cliState.busca}"
               placeholder="Buscar por nome ou telefone…"
               oninput="cliBuscar(this.value)" autocomplete="off">
      </div>
      <div class="hist-resumo" id="cliResumo">Carregando…</div>
    </div>
    <div class="hist-list" id="cliList">
      <div class="hist-empty"><div class="hist-empty-ic">⏳</div>Carregando…</div>
    </div>
    <div id="cliToast"></div>
  </div>`;
  cliCarregar();
}

async function cliCarregar() {
  try {
    cliState.lista = await listarClientes();
    cliState.carregando = false;
    cliRenderLista();
  } catch(e) {
    const l = document.getElementById('cliList');
    if (l) l.innerHTML = '<div class="hist-empty"><div class="hist-empty-ic">❌</div>Erro ao carregar</div>';
  }
}

function cliFiltrar() {
  const t = cliState.busca.trim().toLowerCase();
  if (!t) return [...cliState.lista];
  return cliState.lista.filter(c =>
    c.nome.toLowerCase().includes(t) ||
    (c.fone || '').replace(/\D/g,'').includes(t.replace(/\D/g,'')) ||
    (c.fone || '').toLowerCase().includes(t) ||
    (c.email || '').toLowerCase().includes(t)
  );
}

function cliRenderLista() {
  const lista = cliFiltrar();
  const resumo = document.getElementById('cliResumo');
  const listEl = document.getElementById('cliList');
  if (!listEl) return;
  if (resumo) resumo.textContent = `${lista.length} cliente${lista.length!==1?'s':''}${cliState.lista.length!==lista.length?' de '+cliState.lista.length:''}`;

  if (lista.length === 0) {
    listEl.innerHTML = `<div class="hist-empty">
      <div class="hist-empty-ic">${cliState.lista.length===0?'👥':'🔍'}</div>
      ${cliState.lista.length===0?'Nenhum cliente cadastrado.<br>Toque em <b>+ Novo</b> para começar.':'Nenhum resultado para esta busca.'}
    </div>`;
    return;
  }

  listEl.innerHTML = lista.map(c => cliRenderCard(c)).join('');
}

function cliRenderCard(c) {
  const expanded = cliState.expandido === c.id;
  const ini = (c.nome||'?').charAt(0).toUpperCase();
  const cor  = cliCorAvatar(c.id);

  return `
    <div class="orc-card" id="cliCard${c.id}">
      <div class="orc-card-top" onclick="cliToggle(${c.id})">
        <div class="cli-avatar" style="background:${cor}">${ini}</div>
        <div class="orc-card-info">
          <div class="orc-card-titulo">${esc(c.nome)}</div>
          <div class="orc-card-sub">${c.fone ? esc(c.fone) : '<span style="color:var(--t4)">Sem telefone</span>'}${c.cidade?` · ${esc(c.cidade)}`:''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${c.fone ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();cliWpp(${c.id})" title="WhatsApp">📲</button>` : ''}
          <span style="color:var(--t4);font-size:1rem">${expanded?'▲':'▼'}</span>
        </div>
      </div>
      ${expanded ? cliRenderExpanded(c) : ''}
    </div>
  `;
}

function cliRenderExpanded(c) {
  return `
    <div class="orc-card-expand">
      <div class="orc-card-detail">
        ${c.fone    ? `<div class="orc-detail-row"><span>📱 Telefone</span><span>${esc(c.fone)}</span></div>` : ''}
        ${c.email   ? `<div class="orc-detail-row"><span>✉️ E-mail</span><span>${esc(c.email)}</span></div>` : ''}
        ${c.cidade  ? `<div class="orc-detail-row"><span>📍 Cidade</span><span>${esc(c.cidade)}</span></div>` : ''}
        ${c.obs     ? `<div class="orc-detail-row"><span>📝 Obs.</span><span style="white-space:pre-wrap">${esc(c.obs)}</span></div>` : ''}
        <div class="orc-detail-row" style="opacity:.55;font-size:.65rem">
          <span>Cadastrado</span><span>${formatData(c.criadoEm)}</span>
        </div>
      </div>
      <div class="orc-card-actions">
        <button class="orc-act-btn orc-act-editar"  onclick="cliAbrirForm(${c.id})">✏️ Editar</button>
        <button class="orc-act-btn"                 onclick="cliOrcamentoRapido(${c.id})" style="background:rgba(212,175,55,.1);color:var(--gold1)">🧮 Orçar</button>
        <button class="orc-act-btn orc-act-excluir" onclick="cliExcluir(${c.id})">🗑️ Excluir</button>
      </div>
    </div>
  `;
}

function cliCorAvatar(id) {
  const cores = [
    'rgba(212,175,55,.35)','rgba(80,160,220,.35)','rgba(100,200,140,.35)',
    'rgba(160,120,220,.35)','rgba(220,100,100,.35)','rgba(100,200,255,.35)',
  ];
  return cores[(id||0) % cores.length];
}

function cliToggle(id) {
  cliState.expandido = cliState.expandido === id ? null : id;
  cliRenderLista();
}

function cliBuscar(v) {
  cliState.busca = v;
  cliRenderLista();
}

// ── Formulário de cliente ─────────────────────────────────────
async function cliAbrirForm(id) {
  let cli = null;
  if (id !== null) {
    cli = cliState.lista.find(c => c.id === id) || null;
  }

  showModal(`
    <div class="modal-titulo">${cli ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</div>
    <div style="max-height:65vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px">
      <div class="field">
        <label>👤 Nome *</label>
        <input id="cliFormNome" type="text" value="${cli ? esc(cli.nome) : ''}" placeholder="Nome completo" autocomplete="name">
      </div>
      <div class="field">
        <label>📱 Telefone / WhatsApp</label>
        <input id="cliFormFone" type="tel" value="${cli ? esc(cli.fone||'') : ''}" placeholder="(85) 9 9999-9999">
      </div>
      <div class="field">
        <label>✉️ E-mail</label>
        <input id="cliFormEmail" type="email" value="${cli ? esc(cli.email||'') : ''}" placeholder="email@exemplo.com">
      </div>
      <div class="field">
        <label>📍 Cidade</label>
        <input id="cliFormCidade" type="text" value="${cli ? esc(cli.cidade||'') : ''}" placeholder="Ex: Fortaleza">
      </div>
      <div class="field">
        <label>📝 Observações</label>
        <textarea id="cliFormObs" rows="2" style="width:100%;resize:vertical;font-size:.8rem;padding:8px;border-radius:8px;border:1px solid var(--brd);background:var(--card);color:var(--tx)"
                  placeholder="Anotações sobre o cliente…">${cli ? esc(cli.obs||'') : ''}</textarea>
      </div>
    </div>
    <div id="cliFormErro" style="color:#e55;font-size:.72rem;min-height:16px;margin-top:4px"></div>
    <div class="modal-row" style="margin-top:10px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-gold btn-full" id="cliFormSalvarBtn">💾 Salvar</button>
    </div>
  `);

  document.getElementById('cliFormSalvarBtn').onclick = () => cliSalvarForm(cli);
  // Enter no nome vai salvar
  document.getElementById('cliFormNome').addEventListener('keydown', e => {
    if (e.key === 'Enter') cliSalvarForm(cli);
  });
  setTimeout(() => document.getElementById('cliFormNome')?.focus(), 80);
}

async function cliSalvarForm(cliExistente) {
  const nome   = document.getElementById('cliFormNome')?.value.trim();
  const fone   = document.getElementById('cliFormFone')?.value.trim();
  const email  = document.getElementById('cliFormEmail')?.value.trim();
  const cidade = document.getElementById('cliFormCidade')?.value.trim();
  const obs    = document.getElementById('cliFormObs')?.value.trim();

  if (!nome) {
    const el = document.getElementById('cliFormErro');
    if (el) el.textContent = '⚠️ Nome é obrigatório';
    document.getElementById('cliFormNome')?.focus();
    return;
  }

  const dados = { nome, fone, email, cidade, obs };

  try {
    if (cliExistente) {
      await atualizarCliente({ ...cliExistente, ...dados });
      const idx = cliState.lista.findIndex(c => c.id === cliExistente.id);
      if (idx >= 0) cliState.lista[idx] = { ...cliExistente, ...dados };
      cliToast('✅ Cliente atualizado!');
    } else {
      const novoId = await salvarCliente(dados);
      cliState.lista = await listarClientes();
      cliState.expandido = novoId;
      cliToast('✅ Cliente cadastrado!');
    }
    closeModal();
    cliRenderLista();
  } catch(e) {
    const el = document.getElementById('cliFormErro');
    if (el) el.textContent = '❌ Erro ao salvar: ' + e.message;
  }
}

// ── Ações do card ─────────────────────────────────────────────
async function cliExcluir(id) {
  const c = cliState.lista.find(c => c.id === id);
  if (!c) return;
  showModalConfirm(
    '🗑️ Excluir cliente?',
    `Remover "${c.nome}" do cadastro? Esta ação não pode ser desfeita.`,
    'Excluir',
    async () => {
      try {
        await removerCliente(id);
        cliState.lista = cliState.lista.filter(c => c.id !== id);
        if (cliState.expandido === id) cliState.expandido = null;
        closeModal();
        cliRenderLista();
        cliToast('🗑️ Cliente removido');
      } catch(e) { cliToast('❌ Erro ao excluir'); }
    },
    true
  );
}

function cliWpp(id) {
  const c = cliState.lista.find(c => c.id === id);
  if (!c || !c.fone) return;
  const num = c.fone.replace(/\D/g,'');
  if (!num) { cliToast('⚠️ Telefone inválido'); return; }
  window.open(`https://wa.me/55${num}`, '_blank');
}

function cliOrcamentoRapido(id) {
  const c = cliState.lista.find(c => c.id === id);
  if (!c) return;
  // Preenche dados do cliente no orçamento e navega
  orcState.cliente = c.nome;
  orcState.fone    = c.fone || '';
  navTo('orc');
}

function cliToast(msg) {
  const t = document.getElementById('cliToast');
  if (!t) { histMostrarToast(msg); return; }
  t.innerHTML = `<div class="hist-toast">${msg}</div>`;
  setTimeout(() => { if (t) t.innerHTML = ''; }, 2500);
}
