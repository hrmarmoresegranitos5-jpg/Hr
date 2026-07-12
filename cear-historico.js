// ════════════════════════════════════════════════════════════
// HISTÓRICO
// ════════════════════════════════════════════════════════════

let histState = { filtro:'todos', busca:'', dataInicio:'', dataFim:'', orcamentos:[], expandido:null };

function renderHistorico(wrap) {
  wrap.style.padding = '0';
  wrap.innerHTML = `
    <div class="hist-wrap" id="histWrap">
      <div class="hist-head">
        <div class="hist-titulo">📂 Histórico</div>
        <div class="hist-filtros" id="histFiltros">
          ${[['todos','📋 Todos'],['cliente','👤 Cliente'],['telefone','📱 Telefone'],['data','📅 Data'],['status','🔖 Status']].map(([id,lbl])=>`
            <button class="hist-chip${histState.filtro===id?' on':''}" onclick="histSetFiltro('${id}')">${lbl}</button>
          `).join('')}
        </div>
        <div id="histBuscaWrap">
          ${histState.filtro!=='data'?`
            <div class="hist-busca">
              <span class="hist-busca-ic">🔍</span>
              <input id="histBuscaInput" value="${histState.busca}" placeholder="${histPlaceholder()}" oninput="histSetBusca(this.value)" autocomplete="off">
            </div>
          `:`
            <div class="hist-date-row">
              <div class="hist-date-group"><div class="hist-date-lbl">De</div><input type="date" id="histDataIni" value="${histState.dataInicio}" onchange="histSetDatas(this.value,null)"></div>
              <div class="hist-date-group"><div class="hist-date-lbl">Até</div><input type="date" id="histDataFim" value="${histState.dataFim}" onchange="histSetDatas(null,this.value)"></div>
            </div>
          `}
        </div>
        <div class="hist-resumo" id="histResumo">Carregando…</div>
      </div>
      <div class="hist-list" id="histList"><div class="hist-empty"><div class="hist-empty-ic">⏳</div>Carregando…</div></div>
      <div id="histToast"></div>
    </div>
  `;
  histCarregar();
}

function histPlaceholder() {
  return { todos:'Buscar por cliente, telefone ou tipo…', cliente:'Digite o nome do cliente…', telefone:'Digite o telefone…', data:'', status:'pendente · aprovado · executado · cancelado' }[histState.filtro]||'Buscar…';
}

async function histCarregar() {
  try {
    histState.orcamentos = await listarOrcamentos();
    histRenderLista();
  } catch(e) {
    const l = document.getElementById('histList');
    if (l) l.innerHTML = '<div class="hist-empty"><div class="hist-empty-ic">❌</div>Erro ao carregar</div>';
  }
}

function histFiltrar() {
  let lista = [...histState.orcamentos];
  const t = histState.busca.trim().toLowerCase();
  if (histState.filtro==='cliente' && t) {
    lista = lista.filter(o => (o.clienteNome||'').toLowerCase().includes(t));
  } else if (histState.filtro==='telefone' && t) {
    const d = histState.busca.replace(/\D/g,'');
    lista = lista.filter(o => (o.clienteFone||'').replace(/\D/g,'').includes(d)||(o.clienteFone||'').toLowerCase().includes(t));
  } else if (histState.filtro==='status') {
    const statusMap = {'todos':null,'pendentes':'pendente','aprovados':'aprovado','executados':'executado','cancelados':'cancelado'};
    // filtro de status usa sub-filtro via busca de texto
    if (t) lista = lista.filter(o => (o.status||'pendente').includes(t));
  } else if (histState.filtro==='data') {
    if (histState.dataInicio) lista = lista.filter(o => o.criadoEm >= histState.dataInicio);
    if (histState.dataFim)    lista = lista.filter(o => o.criadoEm <= histState.dataFim+'T23:59:59');
  } else if (t) {
    lista = lista.filter(o => (o.clienteNome||'').toLowerCase().includes(t)||(o.clienteFone||'').toLowerCase().includes(t)||((TIPO_LABEL[o.tipo]||'').toLowerCase().includes(t)));
  }
  return lista;
}

function histRenderLista() {
  const lista = histFiltrar();
  const resumo = document.getElementById('histResumo');
  const listEl = document.getElementById('histList');
  if (!listEl) return;
  if (resumo) resumo.textContent = `${lista.length} orçamento${lista.length!==1?'s':''}${histState.orcamentos.length!==lista.length?` de ${histState.orcamentos.length}`:''}`;
  if (lista.length===0) {
    listEl.innerHTML = `<div class="hist-empty"><div class="hist-empty-ic">${histState.orcamentos.length===0?'📭':'🔍'}</div>${histState.orcamentos.length===0?'Nenhum orçamento salvo ainda.\nFaça seu primeiro orçamento!':'Nenhum resultado para esta busca.'}</div>`;
    return;
  }
  listEl.innerHTML = lista.map(orc => histRenderCard(orc)).join('');
}

function _orcVencido(orc) {
  if (!orc.criadoEm) return false;
  var diasVal = (CFG.comercial?.validade_dias) || 7;
  var criado = new Date(orc.criadoEm);
  var limite = new Date(criado.getTime() + diasVal * 86400000);
  var status = orc.status || 'pendente';
  // Só marca como vencido se ainda estiver pendente
  return status === 'pendente' && new Date() > limite;
}


  const c = corTipo(orc.tipo);
  const expanded = histState.expandido === orc.id;
  const isMulti = orc.tipo === 'multi' || Array.isArray(orc.itens);

  // Subtítulo adaptado
  let subtitulo;
  if (isMulti) {
    const nItens = Array.isArray(orc.itens) ? orc.itens.length : '?';
    subtitulo = `${nItens} item${nItens !== 1 ? 's' : ''}`;
  } else {
    subtitulo = `${orc.larg || '?'}×${orc.alt || '?'}cm`;
    if (orc.vidro && VIDROS[orc.vidro]) subtitulo += ' · ' + VIDROS[orc.vidro].nome;
  }

  // Título
  const titulo = isMulti
    ? '📦 Orçamento Múltiplo'
    : (TIPO_LABEL[orc.tipo] || orc.tipo);

  // Linhas do resultado — frete zero exibe "Grátis ✓"
  let linhasHTML = '';
  if (isMulti && Array.isArray(orc.itens)) {
    linhasHTML = orc.itens.map(it => {
      const tipoLabel = TIPO_LABEL[it.tipo] || it.tipo;
      const medidas   = (it.larg && it.alt) ? ` ${it.larg}×${it.alt}cm` : '';
      const valTotal  = it.resultado ? formatBRL(it.resultado.total) : '—';
      return `<div class="orc-detail-row"><span>${tipoLabel}${medidas}</span><span>${valTotal}</span></div>`;
    }).join('');
  } else {
    linhasHTML = (orc.resultado?.linhas || []).map(l => {
      const isFrete = l.nome.startsWith('Frete');
      const valorExibido = (l.valor === 0 && isFrete)
        ? '<span style="color:var(--grn)">Grátis ✓</span>'
        : formatBRL(l.valor);
      return `<div class="orc-detail-row"><span>${l.nome}</span><span>${valorExibido}</span></div>`;
    }).join('');
  }

  return `
    <div class="orc-card" id="orcCard${orc.id}">
      <div class="orc-card-top" onclick="histToggleExpand(${orc.id})">
        <div class="orc-card-ic" style="background:${c.bg};border:1px solid ${c.brd}">${isMulti ? '📦' : (TIPO_ICON[orc.tipo] || '📋')}</div>
        <div class="orc-card-info">
          <div class="orc-card-titulo">${titulo}${orc.clienteNome ? ` · ${orc.clienteNome}` : ''}</div>
          <div class="orc-card-sub">${subtitulo}</div>
        </div>
        <div class="orc-card-total">
          <div class="orc-card-valor">${orc.resultado ? formatBRL(orc.resultado.total) : '—'}</div>
          <div style="display:flex;align-items:center;gap:4px">
            <div class="orc-card-data">${formatData(orc.criadoEm)}</div>
            ${_orcVencido(orc) ? `<div class="hist-badge-status" style="background:rgba(220,100,40,.15);color:rgba(220,100,40,1);border:1px solid rgba(220,100,40,.3);font-size:.58rem;padding:1px 5px;border-radius:10px;font-weight:700">⚠️ Vencido</div>` : ''}
            ${orc.status && orc.status !== 'pendente' ? `<div class="hist-badge-status hist-badge-${orc.status}">${{aprovado:'✅',executado:'🔨',cancelado:'❌'}[orc.status]||''}</div>` : ''}
          </div>
        </div>
      </div>
      ${expanded ? `
        <div class="orc-card-expand">
          <div class="orc-card-detail">
            ${linhasHTML}
            ${orc.resultado?.totalAvista < orc.resultado?.total ? `<div class="orc-detail-row" style="margin-top:4px"><span style="color:var(--grn)">💚 À vista</span><span style="color:var(--grn)">${formatBRL(orc.resultado.totalAvista)}</span></div>` : ''}
            ${orc.clienteFone ? `<div class="orc-detail-row"><span>📱 Telefone</span><span>${orc.clienteFone}</span></div>` : ''}
          </div>
          <div class="hist-status-row">
            ${['pendente','aprovado','executado','cancelado'].map(s => {
              const ativo = (orc.status||'pendente') === s;
              const cores = {pendente:'var(--gold1)',aprovado:'var(--grn)',executado:'rgba(80,160,220,1)',cancelado:'rgba(220,80,80,1)'};
              const icones = {pendente:'⏳',aprovado:'✅',executado:'🔨',cancelado:'❌'};
              return `<button class="hist-status-chip${ativo?' hist-status-on':''}"
                style="${ativo?'border-color:'+cores[s]+';color:'+cores[s]+';background:'+cores[s].replace('1)','0.12)'):'--x:0'}"
                onclick="histSetStatus(${orc.id},'${s}')">
                ${icones[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}
              </button>`;
            }).join('')}
          </div>
          <div class="orc-card-actions">
            <button class="orc-act-btn orc-act-editar"  onclick="histEditar(${orc.id})">✏️ Editar</button>
            <button class="orc-act-btn orc-act-dupl"    onclick="histDuplicar(${orc.id})">📋 Duplicar</button>
            <button class="orc-act-btn orc-act-excluir" onclick="histExcluir(${orc.id})">🗑️ Excluir</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function histSetStatus(id, novoStatus) {
  const orc = histState.orcamentos.find(o => o.id === id);
  if (!orc) return;
  try {
    const atualizado = { ...orc, status: novoStatus };
    await atualizarOrcamento(atualizado);
    const idx = histState.orcamentos.findIndex(o => o.id === id);
    if (idx >= 0) histState.orcamentos[idx] = atualizado;
    histRenderLista();
    histMostrarToast('✅ Status atualizado: ' + novoStatus);
  } catch(e) { histMostrarToast('❌ Erro ao atualizar status'); }
}

function histToggleExpand(id) {
  histState.expandido = histState.expandido===id ? null : id;
  histRenderLista();
}

function histSetFiltro(id) {
  histState.filtro = id; histState.busca=''; histState.dataInicio=''; histState.dataFim='';
  const fw = document.getElementById('histFiltros');
  if (fw) fw.querySelectorAll('.hist-chip').forEach(b=>{ b.classList.toggle('on', b.textContent.trim()===(['todos','cliente','telefone','data'].map((x,i)=>['📋 Todos','👤 Cliente','📱 Telefone','📅 Data'][i])[['todos','cliente','telefone','data'].indexOf(id)])); });
  // Re-render search area
  const bw = document.getElementById('histBuscaWrap');
  if (bw) bw.innerHTML = histState.filtro!=='data'?`<div class="hist-busca"><span class="hist-busca-ic">🔍</span><input id="histBuscaInput" value="" placeholder="${histPlaceholder()}" oninput="histSetBusca(this.value)" autocomplete="off"></div>`:`<div class="hist-date-row"><div class="hist-date-group"><div class="hist-date-lbl">De</div><input type="date" id="histDataIni" onchange="histSetDatas(this.value,null)"></div><div class="hist-date-group"><div class="hist-date-lbl">Até</div><input type="date" id="histDataFim" onchange="histSetDatas(null,this.value)"></div></div>`;
  // Update chip styles
  document.querySelectorAll('.hist-chip').forEach((b,i)=>b.classList.toggle('on',i===['todos','cliente','telefone','data'].indexOf(id)));
  histRenderLista();
}

function histSetBusca(v) { histState.busca=v; histRenderLista(); }
function histSetDatas(ini,fim) {
  if (ini!==null) histState.dataInicio=ini;
  if (fim!==null) histState.dataFim=fim;
  histRenderLista();
}

function histMostrarToast(msg) {
  const t = document.getElementById('histToast');
  if (!t) return;
  t.innerHTML = `<div class="hist-toast">${msg}</div>`;
  setTimeout(()=>{ if(t) t.innerHTML=''; },2500);
}

async function histExcluir(id) {
  const orc = histState.orcamentos.find(o=>o.id===id);
  if (!orc) return;
  showModalConfirm('🗑️ Excluir orçamento?',`Deseja excluir o orçamento de ${orc.clienteNome||TIPO_LABEL[orc.tipo]}? Esta ação não pode ser desfeita.`,'Excluir',async()=>{
    try {
      await removerOrcamento(id);
      histState.orcamentos = histState.orcamentos.filter(o=>o.id!==id);
      histState.expandido=null;
      histRenderLista();
      closeModal();
      histMostrarToast('🗑️ Orçamento excluído');
    } catch(e) { histMostrarToast('❌ Erro ao excluir'); }
  }, true);
}

async function histDuplicar(id) {
  const orc = histState.orcamentos.find(o=>o.id===id);
  if (!orc) return;
  try {
    await duplicarOrcamento(orc);
    histState.orcamentos = await listarOrcamentos();
    histRenderLista();
    histMostrarToast('📋 Orçamento duplicado!');
  } catch(e) { histMostrarToast('❌ Erro ao duplicar'); }
}

function histEditar(id) {
  const orc = histState.orcamentos.find(o=>o.id===id);
  if (!orc) return;
  showModalEditar(orc, async(atualizado)=>{
    try {
      await atualizarOrcamento(atualizado);
      const idx = histState.orcamentos.findIndex(o=>o.id===id);
      if (idx>=0) histState.orcamentos[idx] = atualizado;
      histRenderLista();
      closeModal();
      histMostrarToast('✅ Orçamento atualizado!');
    } catch(e) { histMostrarToast('❌ Erro ao salvar'); }
  });
}

