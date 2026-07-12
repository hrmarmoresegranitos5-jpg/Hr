// ════════════════════════════════════════════════════════════
// HOME / DASHBOARD — Layout minimalista
// ════════════════════════════════════════════════════════════

const ATALHOS = [
  { tipo:'pivotante', icone:'🚪', nome:'Porta Pivotante', sub:'Temperado 8mm',       cor:'rgba(212,175,55,0.12)', borda:'rgba(212,175,55,0.25)' },
  { tipo:'correr',    icone:'🔲', nome:'Porta de Correr', sub:'2 ou 4 folhas',       cor:'rgba(80,160,220,0.1)',  borda:'rgba(80,160,220,0.2)'  },
  { tipo:'janela',    icone:'🪟', nome:'Janela',          sub:'Correr / Basculante',  cor:'rgba(100,200,140,0.1)',borda:'rgba(100,200,140,0.2)' },
  { tipo:'box',       icone:'🛁', nome:'Box de Banheiro', sub:'Pivotante / Correr',  cor:'rgba(160,120,220,0.1)',borda:'rgba(160,120,220,0.2)' },
  { tipo:'espelho',   icone:'🪞', nome:'Espelho',         sub:'Com / sem bisotê',     cor:'rgba(220,180,80,0.1)', borda:'rgba(220,180,80,0.2)'  },
  { tipo:'guarda',    icone:'🏗️', nome:'Guarda Corpo',    sub:'Módulos de 120cm',    cor:'rgba(220,100,100,0.1)',borda:'rgba(220,100,100,0.2)' },
];

const MENU_CARDS = [
  { id:'orc',        icone:'🧮', nome:'Orçamento',  sub:'Calcule preços',      cor:'rgba(212,175,55,0.13)', borda:'rgba(212,175,55,0.28)' },
  { id:'financeiro', icone:'💎', nome:'Preços',      sub:'Tabela de vidros',    cor:'rgba(80,160,220,0.1)',  borda:'rgba(80,160,220,0.22)' },
  { id:'historico',  icone:'📂', nome:'Histórico',   sub:'Orçamentos salvos',   cor:'rgba(100,200,140,0.1)',borda:'rgba(100,200,140,0.22)' },
  { id:'clientes',   icone:'👥', nome:'Clientes',    sub:'Cadastro de clientes',cor:'rgba(160,120,220,0.1)',borda:'rgba(160,120,220,0.22)' },
  { id:'config',     icone:'⚙️', nome:'Config.',     sub:'Ajustes do sistema',  cor:'rgba(180,180,180,0.08)',borda:'rgba(180,180,180,0.15)' },
];

async function renderHome(wrap) {
  const isAberto = (() => {
    const d = new Date();
    const h = d.getHours(), day = d.getDay();
    if (day === 0) return false;
    if (day === 6) return h >= 8 && h < 13;
    return h >= 8 && h < 18;
  })();

  const d = new Date();
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const saudacao = d.getHours() < 12 ? 'Bom dia' : d.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  // Render shell imediato, stats carregam async
  wrap.innerHTML = `
    <div id="pgHome" class="home-minimal">

      <div class="hm-top" style="animation:slideUp 160ms ease both">
        <div class="hm-greet">${saudacao} 👋</div>
        <div class="hm-status ${isAberto ? 'aberto' : 'fechado'}">
          <span class="hm-dot ${isAberto ? 'pulsing' : ''}"></span>
          ${isAberto ? 'Aberto agora' : 'Fechado'}
        </div>
      </div>

      <!-- BUSCA GLOBAL -->
      <div class="hm-section" style="animation:slideUp 175ms ease both;padding-bottom:0">
        <div class="hm-busca-global">
          <span style="font-size:.95rem;opacity:.5">🔍</span>
          <input id="hmBuscaGlobal" type="text" placeholder="Buscar clientes ou orçamentos…"
                 autocomplete="off" oninput="hmBuscaGlobalInput(this.value)"
                 style="flex:1;background:none;border:none;outline:none;color:var(--tx);font-size:.82rem;padding:0">
        </div>
        <div id="hmBuscaResultados" style="display:none;margin-top:6px"></div>
      </div>

      <!-- STATS -->
      <div class="hm-section" style="animation:slideUp 185ms ease both" id="hmStatsSection">
        <div class="hm-stats-grid" id="hmStatsGrid">
          ${['hmS1','hmS2','hmS3'].map(id=>`<div class="hm-stat-card hm-stat-loading" id="${id}"><div class="hm-stat-shimmer"></div></div>`).join('')}
        </div>
      </div>

      <div class="hm-section" style="animation:slideUp 200ms ease both">
        <div class="hm-section-lbl">Orçamento rápido</div>
        <div class="hm-orc-grid">
          ${ATALHOS.map((a,i) => `
            <button class="hm-orc-btn" style="animation-delay:${i*30}ms;--hob-color:${a.borda};--hob-bg:${a.cor}" onclick="goOrc('${a.tipo}')">
              <span class="hm-orc-ic">${a.icone}</span>
              <span class="hm-orc-nm">${a.nome}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="hm-section" style="animation:slideUp 240ms ease both">
        <div class="hm-section-lbl">Menu</div>
        <div class="hm-menu-list">
          ${MENU_CARDS.map((m,i) => `
            <button class="hm-menu-row" style="animation-delay:${i*35}ms" onclick="navTo('${m.id}')">
              <span class="hm-menu-ic" style="background:${m.cor};border:1px solid ${m.borda}">${m.icone}</span>
              <div class="hm-menu-txt">
                <div class="hm-menu-nm">${m.nome}</div>
                <div class="hm-menu-sub">${m.sub}</div>
              </div>
              <span class="hm-menu-arr">›</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="height:88px"></div>
    </div>
  `;

  // Carrega stats em paralelo
  try {
    const [st, orcs] = await Promise.all([statsGerais(), listarOrcamentos()]);
    const grid = document.getElementById('hmStatsGrid');
    if (!grid) return;
    const mes = new Date().toLocaleDateString('pt-BR', { month:'long' });
    const diasVal = (CFG.comercial?.validade_dias) || 7;
    const agora = new Date();
    function _orcVencidoSimples(o) {
      if (!o.criadoEm || (o.status && o.status !== 'pendente')) return false;
      return agora > new Date(new Date(o.criadoEm).getTime() + diasVal * 86400000);
    }
    const vencidos = orcs.filter(_orcVencidoSimples).length;
    grid.innerHTML = `
      <div class="hm-stat-card" onclick="navTo('historico')">
        <div class="hm-stat-val">${formatBRL(st.faturadoMes)}</div>
        <div class="hm-stat-lbl">Faturado em ${mes}</div>
      </div>
      <div class="hm-stat-card hm-stat-warn" onclick="navTo('historico')">
        <div class="hm-stat-val">${st.pendentes}${vencidos > 0 ? ` <span style="font-size:.6rem;color:rgba(220,100,40,1)">⚠️${vencidos}</span>` : ''}</div>
        <div class="hm-stat-lbl">Pendente${st.pendentes!==1?'s':''}${vencidos > 0 ? ` · ${vencidos} vencido${vencidos!==1?'s':''}` : ''}</div>
      </div>
      <div class="hm-stat-card" onclick="navTo('clientes')">
        <div class="hm-stat-val">${st.totalClientes}</div>
        <div class="hm-stat-lbl">Cliente${st.totalClientes!==1?'s':''}</div>
      </div>
    `;
    // Último orçamento
    if (st.ultimo) {
      const sec = document.getElementById('hmStatsSection');
      if (sec) {
        const ult = st.ultimo;
        const label = ult.tipo==='multi'
          ? `Múltiplo · ${(ult.itens||[]).length} itens`
          : (TIPO_LABEL[ult.tipo]||ult.tipo) + (ult.larg&&ult.alt ? ` ${ult.larg}×${ult.alt}cm` : '');
        const statusCor = {'aprovado':'var(--grn)','executado':'rgba(80,160,220,1)','cancelado':'rgba(220,80,80,1)'}[ult.status]||'var(--gold1)';
        sec.insertAdjacentHTML('beforeend', `
          <div class="hm-ultimo-card" onclick="navTo('historico')" style="margin-top:10px">
            <div style="font-size:.66rem;color:var(--t4);font-weight:600;margin-bottom:4px">ÚLTIMO ORÇAMENTO</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:.8rem;font-weight:700;color:var(--tx)">${esc(ult.clienteNome||'Sem cliente')} <span style="font-weight:400;color:var(--t3)">· ${label}</span></div>
                <div style="font-size:.68rem;color:var(--t4);margin-top:2px">${formatData(ult.criadoEm)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:.88rem;font-weight:800;color:var(--gold1)">${formatBRL(ult.resultado?.total||0)}</div>
                ${ult.status?`<div style="font-size:.6rem;font-weight:700;color:${statusCor};text-transform:uppercase">${ult.status}</div>`:''}
              </div>
            </div>
          </div>
          <button class="hm-menu-row" onclick="hmAbrirRelatorio()" style="margin-top:10px;width:100%">
            <span class="hm-menu-ic" style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.2)">📊</span>
            <div class="hm-menu-txt">
              <div class="hm-menu-nm">Relatório Mensal</div>
              <div class="hm-menu-sub">Top produtos, ticket médio e evolução</div>
            </div>
            <span class="hm-menu-arr">›</span>
          </button>
        `);
      }
    }
  } catch(e) {
    // stats falharam — remove os shimmer placeholders silenciosamente
    const grid = document.getElementById('hmStatsGrid');
    if (grid) grid.innerHTML = '';
  }
}

function goOrc(tipo) {
  orcState.tipo = tipo;
  orcState.larg = DEFAULTS[tipo]?.larg ?? 80;
  orcState.alt  = DEFAULTS[tipo]?.alt ?? 120;
  orcState.vidroKey = (VIDROS_POR_TIPO[tipo]||[])[0]||'';
  orcState.accs = {};
  orcState.resultado = null;
  navTo('orc');
}

let _hmBuscaTimer = null;
async function hmBuscaGlobalInput(val) {
  const el = document.getElementById('hmBuscaResultados');
  if (!el) return;
  const q = val.trim().toLowerCase();
  if (!q) { el.style.display = 'none'; el.innerHTML = ''; return; }
  clearTimeout(_hmBuscaTimer);
  _hmBuscaTimer = setTimeout(async () => {
    try {
      const [orcs, clis] = await Promise.all([listarOrcamentos(), listarClientes()]);
      const orcMatch = orcs.filter(o =>
        (o.clienteNome||'').toLowerCase().includes(q) ||
        (o.clienteFone||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
        (TIPO_LABEL[o.tipo]||'').toLowerCase().includes(q)
      ).slice(0,5);
      const cliMatch = clis.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        (c.fone||'').replace(/\D/g,'').includes(q.replace(/\D/g,''))
      ).slice(0,4);
      if (!orcMatch.length && !cliMatch.length) {
        el.innerHTML = '<div style="font-size:.75rem;color:var(--t4);padding:8px 4px">Nenhum resultado</div>';
        el.style.display = 'block'; return;
      }
      let html = '';
      if (cliMatch.length) {
        html += '<div style="font-size:.62rem;color:var(--t4);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">Clientes</div>';
        html += cliMatch.map(c => `
          <div class="hm-busca-item" onclick="navTo('clientes')">
            <span style="font-size:.85rem">👤</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.8rem;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.nome)}</div>
              ${c.fone?`<div style="font-size:.68rem;color:var(--t4)">${esc(c.fone)}</div>`:''}
            </div>
            <span style="font-size:.7rem;color:var(--t4)">›</span>
          </div>`).join('');
      }
      if (orcMatch.length) {
        html += '<div style="font-size:.62rem;color:var(--t4);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:8px;margin-bottom:4px">Orçamentos</div>';
        html += orcMatch.map(o => {
          const tl = o.tipo==='multi' ? '📦 Múltiplo' : (TIPO_LABEL[o.tipo]||o.tipo);
          return `<div class="hm-busca-item" onclick="navTo('historico')">
            <span style="font-size:.85rem">📋</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.8rem;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.clienteNome?esc(o.clienteNome)+' · ':'' }${tl}</div>
              <div style="font-size:.68rem;color:var(--t4)">${formatData(o.criadoEm)} · ${o.resultado?formatBRL(o.resultado.total):'—'}</div>
            </div>
            <span style="font-size:.7rem;color:var(--t4)">›</span>
          </div>`;
        }).join('');
      }
      el.innerHTML = html;
      el.style.display = 'block';
    } catch(e) { el.style.display = 'none'; }
  }, 200);
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO MENSAL
// ════════════════════════════════════════════════════════════
async function hmAbrirRelatorio() {
  showModal('<div class="modal-titulo">📊 Carregando relatório…</div>');
  try {
    const orcs = await listarOrcamentos();
    const agora = new Date();
    const mesAtual = agora.getFullYear() + '-' + String(agora.getMonth()+1).padStart(2,'0');
    const mesLabel = agora.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

    // Orçamentos do mês
    const orcsMes = orcs.filter(o => (o.criadoEm||'').startsWith(mesAtual));

    // Agrupamento por status
    const porStatus = { pendente:0, aprovado:0, executado:0, cancelado:0 };
    orcsMes.forEach(o => {
      const s = o.status || 'pendente';
      if (porStatus[s] !== undefined) porStatus[s]++;
    });

    // Top 5 produtos
    const contagem = {};
    orcsMes.forEach(o => {
      if (o.tipo === 'multi' && Array.isArray(o.itens)) {
        o.itens.forEach(it => { contagem[it.tipo] = (contagem[it.tipo]||0) + (it.qty||1); });
      } else if (o.tipo) {
        contagem[o.tipo] = (contagem[o.tipo]||0) + 1;
      }
    });
    const top5 = Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Ticket médio (só orçamentos com valor)
    const comValor = orcsMes.filter(o => o.resultado?.total > 0);
    const ticketMedio = comValor.length
      ? comValor.reduce((s,o)=>s+(o.resultado.total||0),0) / comValor.length
      : 0;

    // Evolução semanal (últimas 4 semanas)
    const semanas = [0,0,0,0];
    const hoje = agora.getTime();
    orcsMes.forEach(o => {
      if (!o.criadoEm || !o.resultado?.total) return;
      const diff = Math.floor((hoje - new Date(o.criadoEm).getTime()) / 86400000);
      const semIdx = Math.min(3, Math.floor(diff / 7));
      semanas[semIdx] += o.resultado.total;
    });
    const maxSem = Math.max(...semanas, 1);

    // SVG barras semanais
    const barW = 40, barH = 60, gap = 14;
    const svgW = (barW + gap) * 4 + gap;
    const svgBars = semanas.map((v, i) => {
      const h = Math.round((v / maxSem) * barH) || 2;
      const x = gap + i * (barW + gap);
      const y = barH - h + 10;
      const lbl = i === 0 ? 'Esta' : i + 'a atr';
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5"
        fill="${i===0?'url(#goldGrad)':'rgba(201,168,76,.3)'}"/>
        <text x="${x + barW/2}" y="${barH+24}" text-anchor="middle"
          font-size="7" fill="rgba(255,255,255,.4)">${lbl}</text>
        ${v>0?`<text x="${x+barW/2}" y="${y-4}" text-anchor="middle"
          font-size="7.5" font-weight="700" fill="rgba(212,175,55,.9)">${formatBRL(v).replace('R$','')}</text>`:''}`;
    }).join('');
    const svg = `<svg width="${svgW}" height="${barH+32}" style="overflow:visible">
      <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#EDD060"/><stop offset="100%" stop-color="#C9A84C"/>
      </linearGradient></defs>
      ${svgBars}
    </svg>`;

    // Status pills
    const statusHTML = Object.entries(porStatus).map(([s,n]) => {
      const ic = {pendente:'⏳',aprovado:'✅',executado:'🔨',cancelado:'❌'}[s];
      const cor = {pendente:'var(--gold1)',aprovado:'var(--grn)',executado:'rgba(80,160,220,1)',cancelado:'rgba(220,80,80,1)'}[s];
      return `<div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,.04);border-radius:8px">
        <div style="font-size:1rem">${ic}</div>
        <div style="font-size:1rem;font-weight:800;color:${cor}">${n}</div>
        <div style="font-size:.6rem;color:var(--t4)">${s}</div>
      </div>`;
    }).join('');

    // Top produtos
    const top5HTML = top5.length ? top5.map(([tipo, cnt]) => {
      const pct = Math.round((cnt / (orcsMes.length||1)) * 100);
      return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:3px">
          <span style="color:var(--tx);font-weight:600">${TIPO_LABEL[tipo]||tipo}</span>
          <span style="color:var(--t3)">${cnt} orç.</span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,.07);border-radius:3px">
          <div style="height:5px;background:linear-gradient(90deg,#C9A84C,#EDD060);border-radius:3px;width:${pct}%"></div>
        </div>
      </div>`;
    }).join('') : '<div style="color:var(--t4);font-size:.75rem">Sem dados</div>';

    showModal(`
      <div style="max-height:75vh;overflow-y:auto">
        <div class="modal-titulo">📊 ${mesLabel}</div>

        <div style="display:flex;gap:6px;margin-bottom:14px">${statusHTML}</div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;
          background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.15);border-radius:10px;padding:10px 14px">
          <div>
            <div style="font-size:.62rem;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Ticket médio</div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--gold1)">${formatBRL(ticketMedio)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.62rem;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Total do mês</div>
            <div style="font-size:1.2rem;font-weight:800;color:var(--gold1)">${formatBRL(orcsMes.reduce((s,o)=>s+(o.resultado?.total||0),0))}</div>
          </div>
        </div>

        <div style="font-size:.62rem;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Top produtos</div>
        ${top5HTML}

        <div style="font-size:.62rem;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 8px">Evolução semanal</div>
        <div style="display:flex;justify-content:center">${svg}</div>
      </div>
      <button class="btn btn-ghost btn-full" style="margin-top:14px" onclick="closeModal()">Fechar</button>
    `);
  } catch(e) {
    showModal('<div class="modal-titulo">❌ Erro ao carregar relatório</div><button class="btn btn-ghost btn-full" onclick="closeModal()">Fechar</button>');
  }
}
