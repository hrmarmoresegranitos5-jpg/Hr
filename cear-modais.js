// ════════════════════════════════════════════════════════════
// MODAIS
// ════════════════════════════════════════════════════════════

function showModal(html) {
  const c = document.getElementById('modalContainer');
  c.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop" onclick="closeModal()">
      <div class="modal-box" onclick="event.stopPropagation()">${html}</div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

function showModalConfirm(titulo, mensagem, labelConfirmar, onConfirmar, perigoso=false) {
  showModal(`
    <div class="modal-titulo">${titulo}</div>
    <div class="modal-msg">${mensagem}</div>
    <div class="modal-row">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancelar</button>
      <button class="btn ${perigoso?'btn-red':'btn-gold'} btn-full" id="modalConfirmBtn">${labelConfirmar}</button>
    </div>
  `);
  document.getElementById('modalConfirmBtn').onclick = onConfirmar;
}

function showModalWpp(texto, onEnviar) {
  showModal(`
    <div class="modal-titulo">📲 Enviar pelo WhatsApp</div>
    <div class="modal-wpp-preview">${texto}</div>
    <div class="modal-row">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-grn btn-full" id="modalWppBtn">Abrir WhatsApp</button>
    </div>
  `);
  document.getElementById('modalWppBtn').onclick = onEnviar;
}

function showModalEditar(orc, onSalvar) {
  const tiposOpts = TIPOS.map(t=>`<option value="${t.id}"${orc.tipo===t.id?' selected':''}>${t.label}</option>`).join('');
  showModal(`
    <div class="modal-titulo">✏️ Editar Orçamento</div>
    <div style="max-height:60vh;overflow-y:auto">
      <div class="field"><label>Tipo</label><select id="editTipo" onchange="editTipoChange()">${tiposOpts}</select></div>
      <div class="campo-row">
        <div class="field"><label>Largura (cm)</label><input id="editLarg" type="number" value="${orc.larg}" placeholder="cm"></div>
        <div class="field"><label>Altura (cm)</label><input id="editAlt" type="number" value="${orc.alt}" placeholder="cm"></div>
      </div>
      <div class="field"><label>KM para frete</label><input id="editKm" type="number" value="${orc.km||0}" placeholder="0"></div>
      <div class="field"><label>Cliente</label><input id="editCliente" type="text" value="${orc.clienteNome||''}" placeholder="Nome"></div>
      <div class="field"><label>Telefone</label><input id="editFone" type="tel" value="${orc.clienteFone||''}" placeholder="(85) 9..."></div>
    </div>
    <div class="modal-row" style="margin-top:12px">
      <button class="btn btn-ghost btn-full" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-gold btn-full" id="modalEditSalvarBtn">Salvar</button>
    </div>
  `);
  document.getElementById('modalEditSalvarBtn').onclick = () => {
    const tipo  = document.getElementById('editTipo').value;
    const larg  = parseFloat(document.getElementById('editLarg').value)||orc.larg;
    const alt   = parseFloat(document.getElementById('editAlt').value)||orc.alt;
    const km    = parseFloat(document.getElementById('editKm').value)||0;
    const clienteNome = document.getElementById('editCliente').value.trim();
    const clienteFone = document.getElementById('editFone').value.trim();
    const novoRes = calcularOrcamento({
      tipo, larg, alt,
      vidro:          orc.vidro,
      accs:           orc.accs||{},
      km,
      folhasCorrer:   orc.folhasCorrer   || 2,
      pivFolhas:      orc.pivFolhas      || 1,
      kitPivotante:   orc.kitPivotante   || 'comum',
      kitCor:         orc.kitCor         || 'branco',
      janelaFolhas:   orc.janelaFolhas   || 2,
      temFixo:        !!orc.temFixo,
      fixoLarg:       orc.fixoLarg       || 40,
      temBandeirola:  !!orc.temBandeirola,
      bandH:          orc.bandH          || 40,
      temMola:        (orc.molaQtd||0)   > 0,
      molaQtd:        orc.molaQtd        || 0,
      puxadoresQtd:   orc.puxadoresQtd   || 1,
      puxadoresCorrerQtd: orc.puxadoresCorrerQtd || 1,
      boxTipo:        orc.boxTipo        || 'conv',
      largB:          orc.largB          || 80,
    });
    onSalvar({ ...orc, tipo, larg, alt, km, clienteNome, clienteFone, resultado:novoRes||orc.resultado });
  };
}


// ════════════════════════════════════════════════════════════
// MODAL COMPARTILHAR — escolha entre PDF e WhatsApp
// ════════════════════════════════════════════════════════════

function showModalCompartilhar(state) {
  const res = state.resultado;
  const cliente = state.cliente || '';
  const fone = state.fone || '';
  const tipoLabel = TIPO_LABEL[state.tipo] || state.tipo;
  const vidroNome = VIDROS[state.vidroKey]?.nome || '';
  const dataStr = new Date().toLocaleDateString('pt-BR');

  showModal(`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:2rem;margin-bottom:8px">📤</div>
      <div style="font-size:.9rem;font-weight:800;color:var(--tx);margin-bottom:4px">Compartilhar Orçamento</div>
      <div style="font-size:.68rem;color:var(--t4)">Escolha como deseja enviar</div>
    </div>

    <button class="comp-opt" id="compPdfBtn" onclick="orcGerarPDF()">
      <div class="comp-opt-ic" style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3)">📄</div>
      <div class="comp-opt-body">
        <div class="comp-opt-nm">PDF Profissional</div>
        <div class="comp-opt-sub">Documento formatado com logo, tabela e dados completos</div>
      </div>
      <div class="comp-opt-arr">›</div>
    </button>

    <button class="comp-opt" id="compWppBtn" onclick="orcWppDireto()">
      <div class="comp-opt-ic" style="background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25)">💬</div>
      <div class="comp-opt-body">
        <div class="comp-opt-nm">Texto pelo WhatsApp</div>
        <div class="comp-opt-sub">Mensagem formatada enviada direto no WhatsApp</div>
      </div>
      <div class="comp-opt-arr">›</div>
    </button>

    <button class="comp-opt" id="compEmailBtn" onclick="orcEnviarEmail()">
      <div class="comp-opt-ic" style="background:rgba(80,160,220,0.1);border:1px solid rgba(80,160,220,0.25)">✉️</div>
      <div class="comp-opt-body">
        <div class="comp-opt-nm">Enviar por E-mail</div>
        <div class="comp-opt-sub">Abre o app de e-mail com o orçamento no corpo</div>
      </div>
      <div class="comp-opt-arr">›</div>
    </button>

    <button class="btn btn-ghost btn-full" style="margin-top:12px" onclick="closeModal()">Cancelar</button>
  `);
}

// ════════════════════════════════════════════════════════════
// GERADOR DE PDF PROFISSIONAL
// ════════════════════════════════════════════════════════════

async function gerarPDFOrcamento(state) {
  const res = state.resultado;
  if (!res) return;

  // ── Mostrar loading ──────────────────────────────────────
  const btnPdf = document.getElementById('compPdfBtn');
  const btnOrig = btnPdf ? btnPdf.innerHTML : '';
  if (btnPdf) btnPdf.innerHTML = '<div class="comp-opt-ic" style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3)">⏳</div><div class="comp-opt-body"><div class="comp-opt-nm">Gerando PDF...</div></div>';

  try {
    const { jsPDF } = window.jspdf;

    const tipoLabel = TIPO_LABEL[state.tipo] || state.tipo;
    const vidroObj  = VIDROS[state.vidroKey];
    const cliente   = state.cliente || '—';
    const fone      = state.fone    || '—';
    const dataStr   = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const dataNum   = new Date().toLocaleDateString('pt-BR');
    const numOrc    = 'ORC-' + Date.now().toString().slice(-6);

    // Info de folhas para porta de correr
    const isCorrer = state.tipo === 'correr';
    const nFolhas  = isCorrer ? (Number(state.folhasCorrer) || 2) : 0;
    const nMoveis  = isCorrer ? (CORRER_MOVEIS[nFolhas] ?? 2) : 0;
    const nFixas   = nFolhas - nMoveis;
    const configCorrer = isCorrer
      ? (nFixas > 0
          ? `${nFolhas} folhas (${nMoveis} móve${nMoveis>1?'is':'l'} + ${nFixas} fixa${nFixas>1?'s':''})`
          : `${nFolhas} folha${nFolhas>1?'s':''} móve${nMoveis>1?'is':'l'}`)
      : '';

    const logoSrc = typeof LOGO_B64 !== 'undefined' ? LOGO_B64 : '';

    // ── Renderizar HTML em container oculto ─────────────────
    const linhasHTML = res.linhas.map(l => `
      <tr>
        <td style="padding:10px 14px;color:#444;font-size:13px;border-bottom:1px solid #f0ede6">${l.nome}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:600;color:#1a1a2e;font-size:13px;border-bottom:1px solid #f0ede6">${formatBRL(l.valor)}</td>
      </tr>
    `).join('');

    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" style="height:70px;object-fit:contain;display:block">`
      : `<div style="font-size:22px;font-weight:900;color:#EDD060">CP</div>`;

    const clienteSection = (cliente !== '—' || fone !== '—') ? `
      <div style="margin-bottom:6px;font-size:9px;font-weight:700;color:#bbb;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:16px;height:2px;background:linear-gradient(90deg,#C9A84C,transparent);border-radius:2px"></span>Cliente
      </div>
      <div style="background:#faf9f6;border:1px solid #ede9df;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;gap:28px;flex-wrap:wrap">
        ${cliente !== '—' ? `<div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">NOME</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${cliente}</div></div>` : ''}
        ${fone !== '—' ? `<div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">TELEFONE</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${fone}</div></div>` : ''}
        <div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">DATA</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${dataNum}</div></div>
      </div>
    ` : '';

    const htmlContent = `
      <div style="font-family:'Outfit',Arial,sans-serif;background:#fff;width:680px;margin:0 auto">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0e0e1a 0%,#1a1a2e 60%,#14141f 100%);padding:30px 34px 26px;display:flex;align-items:center;justify-content:space-between;position:relative">
          <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C9A84C 30%,#EDD060 50%,#C9A84C 70%,transparent)"></div>
          <div>
            ${logoHtml}
            <div style="margin-top:8px">
              <div style="font-size:19px;font-weight:800;color:#EDD060">Ceará Planejados</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:.06em">Vidraçaria · Marcenaria · Serralheria</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;color:rgba(212,175,55,0.7);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Orçamento</div>
            <div style="font-size:16px;font-weight:800;color:#EDD060;margin-bottom:4px">${numOrc}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5)">${dataStr}</div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:30px 34px;background:#fff">

          <!-- Título -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-bottom:14px;border-bottom:2px solid #f0ede6">
            <div style="font-size:21px;font-weight:800;color:#1a1a2e">Proposta Comercial</div>
            <div style="background:linear-gradient(135deg,#C9A84C,#EDD060);color:#0e0e1a;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.05em">VÁLIDO 7 DIAS</div>
          </div>

          <!-- Cliente -->
          ${clienteSection}

          <!-- Produto -->
          <div style="margin-bottom:6px;font-size:9px;font-weight:700;color:#bbb;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:16px;height:2px;background:linear-gradient(90deg,#C9A84C,transparent);border-radius:2px"></span>Produto
          </div>
          <div style="background:linear-gradient(135deg,rgba(201,168,76,0.07),rgba(201,168,76,0.02));border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;gap:22px;flex-wrap:wrap">
            <div><div style="font-size:10px;color:#a08030;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">TIPO</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${tipoLabel}</div></div>
            <div><div style="font-size:10px;color:#a08030;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">MEDIDAS</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${state.larg} × ${state.alt} cm</div></div>
            ${isCorrer ? `<div><div style="font-size:10px;color:#a08030;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">CONFIGURAÇÃO</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${configCorrer}</div></div>` : ''}
            ${vidroObj ? `<div><div style="font-size:10px;color:#a08030;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">VIDRO</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${vidroObj.nome}</div></div>` : ''}
          </div>

          <!-- Tabela -->
          <div style="margin-bottom:6px;font-size:9px;font-weight:700;color:#bbb;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:16px;height:2px;background:linear-gradient(90deg,#C9A84C,transparent);border-radius:2px"></span>Composição do Valor
          </div>
          <div style="border:1px solid #ede9df;border-radius:12px;overflow:hidden;margin-bottom:14px">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:linear-gradient(135deg,#0e0e1a,#1a1a2e)">
                  <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(212,175,55,0.9);letter-spacing:.08em;text-transform:uppercase">Descrição</th>
                  <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:rgba(212,175,55,0.9);letter-spacing:.08em;text-transform:uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>${linhasHTML}</tbody>
            </table>
            <div style="background:linear-gradient(135deg,#0e0e1a,#1a1a2e);padding:18px 14px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:.06em;text-transform:uppercase">Total</div>
              <div style="font-size:24px;font-weight:800;color:#EDD060">${formatBRL(res.total)}</div>
            </div>
          </div>

          <!-- À vista -->
          <div style="background:rgba(37,180,90,0.08);border:1px solid rgba(37,180,90,0.2);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
            <div style="font-size:11px;color:#2a9e5a;font-weight:700">💚 Pagamento à vista (10% desconto)</div>
            <div style="font-size:16px;font-weight:800;color:#2a9e5a">${formatBRL(res.totalAvista)}</div>
          </div>

          <!-- Condições -->
          <div style="background:#faf9f6;border:1px solid #ede9df;border-radius:12px;padding:16px 18px">
            <div style="font-size:9px;font-weight:700;color:#bbb;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Condições Gerais</div>
            <div style="font-size:12px;color:#777;line-height:1.8">
              • Vidro temperado 8mm — resistente e seguro<br>
              • Frete grátis em até 20 km<br>
              • Instalação profissional disponível<br>
              • Garantia inclusa no serviço<br>
              • Orçamento válido por 7 dias corridos
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#0e0e1a;padding:18px 34px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:10px;color:rgba(255,255,255,0.3)">Gerado em ${dataStr} · ${numOrc}</div>
          <div style="font-size:11px;font-weight:700;color:rgba(201,168,76,0.6)">Ceará Planejados</div>
        </div>

      </div>
    `;

    // ── Criar container temporário ───────────────────────────
    const container = document.createElement('div');
    container.style.cssText = `
      position:fixed;top:-9999px;left:-9999px;
      width:680px;background:#fff;
      font-family:'Outfit',Arial,sans-serif;
    `;
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Aguardar fontes carregarem
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 200));

    // ── Capturar com html2canvas ─────────────────────────────
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 680,
      windowWidth: 680,
    });

    document.body.removeChild(container);

    // ── Gerar PDF com jsPDF ──────────────────────────────────
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfW = 210; // A4 largura mm
    const pdfH = (canvas.height * pdfW) / canvas.width;

    const doc = new jsPDF({
      orientation: pdfH > 297 ? 'portrait' : 'portrait',
      unit: 'mm',
      format: pdfH > 297 ? [pdfW, pdfH] : 'a4',
    });

    doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);

    const nomeArquivo = `Orcamento_${numOrc}${cliente !== '—' ? '_' + cliente.replace(/\s+/g,'_') : ''}.pdf`;

    // ── Compartilhar ou baixar ───────────────────────────────
    const pdfBlob = doc.output('blob');

    if (navigator.canShare && navigator.share) {
      try {
        const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          closeModal();
          await navigator.share({
            files: [file],
            title: `Orçamento ${numOrc} — Ceará Planejados`,
          });
          return;
        }
      } catch (shareErr) {
        // Fallback para download se o share falhar
      }
    }

    // Fallback: download direto
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    closeModal();

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    if (btnPdf) btnPdf.innerHTML = btnOrig;
    alert('Erro ao gerar PDF. Tente novamente.\n' + err.message);
  }
}


// ════════════════════════════════════════════════════════════
// GERADOR DE PDF — ORÇAMENTO MULTI-ITEM
// ════════════════════════════════════════════════════════════

async function gerarPDFMulti(state) {
  const itens = state.itens || [];
  if (!itens.length) return;

  const btnPdf = document.getElementById('compPdfBtn');
  const btnOrig = btnPdf ? btnPdf.innerHTML : '';
  if (btnPdf) btnPdf.innerHTML = '<div class="comp-opt-ic" style="background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3)">⏳</div><div class="comp-opt-body"><div class="comp-opt-nm">Gerando PDF...</div></div>';

  try {
    const { jsPDF } = window.jspdf;
    const cliente = state.cliente || '—';
    const fone    = state.fone    || '—';
    const dataStr = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const dataNum = new Date().toLocaleDateString('pt-BR');
    const numOrc  = 'ORC-' + Date.now().toString().slice(-6);
    const logoSrc = typeof LOGO_B64 !== 'undefined' ? LOGO_B64 : '';
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" style="height:70px;object-fit:contain;display:block">`
      : `<div style="font-size:22px;font-weight:900;color:#EDD060">CP</div>`;

    const totalGeral = itens.reduce((s,it) => s + (it.resultado?.total||0)*(it.qty||1), 0);
    const co = CFG.comercial;
    const descPct = Math.round((co?.desconto_avista||0.1)*100);

    // Tabela de itens
    const itensHTML = itens.map((it, i) => {
      const tl  = TIPO_LABEL[it.tipo]||it.tipo;
      const dim = (it.snap?.larg && it.snap?.alt) ? `${it.snap.larg}×${it.snap.alt}cm` : '';
      const vidro = (it.snap?.vidroKey && VIDROS[it.snap.vidroKey]) ? VIDROS[it.snap.vidroKey].nome : '';
      const subtotal = (it.resultado?.total||0)*(it.qty||1);
      return `<tr style="${i%2===0?'background:#faf9f6':'background:#fff'}">
        <td style="padding:10px 14px;color:#444;font-size:12px;border-bottom:1px solid #f0ede6">
          <b style="color:#1a1a2e">${tl}</b>${dim?` · ${dim}`:''}${vidro?`<br><span style="font-size:11px;color:#888">${vidro}</span>`:''}
          ${it.qty>1?`<span style="font-size:10px;color:#aaa"> ×${it.qty}</span>`:''}
        </td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;color:#1a1a2e;font-size:13px;border-bottom:1px solid #f0ede6">${formatBRL(subtotal)}</td>
      </tr>`;
    }).join('');

    const clienteSection = (cliente !== '—' || fone !== '—') ? `
      <div style="margin-bottom:6px;font-size:9px;font-weight:700;color:#bbb;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:16px;height:2px;background:linear-gradient(90deg,#C9A84C,transparent);border-radius:2px"></span>Cliente
      </div>
      <div style="background:#faf9f6;border:1px solid #ede9df;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;gap:28px;flex-wrap:wrap">
        ${cliente!=='—'?`<div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">NOME</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${cliente}</div></div>`:''}
        ${fone!=='—'?`<div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">TELEFONE</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${fone}</div></div>`:''}
        <div><div style="font-size:10px;color:#999;font-weight:600;margin-bottom:3px">DATA</div><div style="font-size:14px;font-weight:700;color:#1a1a2e">${dataNum}</div></div>
      </div>` : '';

    const htmlContent = `
      <div style="font-family:'Outfit',Arial,sans-serif;background:#fff;width:680px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0e0e1a 0%,#1a1a2e 60%,#14141f 100%);padding:30px 34px 26px;display:flex;align-items:center;justify-content:space-between;position:relative">
          <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#C9A84C 30%,#EDD060 50%,#C9A84C 70%,transparent)"></div>
          <div>${logoHtml}
            <div style="margin-top:8px">
              <div style="font-size:19px;font-weight:800;color:#EDD060">${esc(CFG.empresa?.nome||'Ceará Planejados')}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:.06em">${esc(CFG.empresa?.subtitulo||'Vidraçaria · Marcenaria · Serralheria')}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;color:rgba(212,175,55,0.7);letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Orçamento</div>
            <div style="font-size:16px;font-weight:800;color:#EDD060;margin-bottom:4px">${numOrc}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5)">${dataStr}</div>
          </div>
        </div>
        <div style="padding:30px 34px;background:#fff">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-bottom:14px;border-bottom:2px solid #f0ede6">
            <div>
              <div style="font-size:21px;font-weight:800;color:#1a1a2e">Proposta Comercial</div>
              <div style="font-size:12px;color:#888;margin-top:2px">${itens.length} item${itens.length!==1?'s':''}</div>
            </div>
            <div style="background:linear-gradient(135deg,#C9A84C,#EDD060);color:#0e0e1a;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.05em">VÁLIDO 7 DIAS</div>
          </div>
          ${clienteSection}
          <div style="margin-bottom:6px;font-size:9px;font-weight:700;color:#bbb;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:16px;height:2px;background:linear-gradient(90deg,#C9A84C,transparent);border-radius:2px"></span>Itens do Orçamento
          </div>
          <div style="border:1px solid #ede9df;border-radius:12px;overflow:hidden;margin-bottom:14px">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:linear-gradient(135deg,#0e0e1a,#1a1a2e)">
                  <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(212,175,55,0.9);letter-spacing:.08em;text-transform:uppercase">Produto</th>
                  <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:rgba(212,175,55,0.9);letter-spacing:.08em;text-transform:uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>${itensHTML}</tbody>
            </table>
            <div style="background:linear-gradient(135deg,#0e0e1a,#1a1a2e);padding:18px 14px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:.06em;text-transform:uppercase">Total Geral</div>
              <div style="font-size:24px;font-weight:800;color:#EDD060">${formatBRL(totalGeral)}</div>
            </div>
          </div>
          <div style="background:rgba(37,180,90,0.08);border:1px solid rgba(37,180,90,0.2);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
            <div style="font-size:11px;color:#2a9e5a;font-weight:700">💚 Pagamento à vista (${descPct}% desconto nas ferragens)</div>
            <div style="font-size:15px;font-weight:800;color:#2a9e5a">Consultar</div>
          </div>
          <div style="background:#faf9f6;border:1px solid #ede9df;border-radius:12px;padding:16px 18px">
            <div style="font-size:9px;font-weight:700;color:#bbb;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Condições Gerais</div>
            <div style="font-size:12px;color:#777;line-height:1.8">
              • Vidros temperados 8mm — resistentes e seguros<br>
              • Frete grátis até ${co?.frete_gratis_km||20} km<br>
              • Instalação profissional disponível<br>
              • Orçamento válido por 7 dias corridos
            </div>
          </div>
        </div>
        <div style="background:#0e0e1a;padding:18px 34px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:10px;color:rgba(255,255,255,0.3)">Gerado em ${dataStr} · ${numOrc}</div>
          <div style="font-size:11px;font-weight:700;color:rgba(201,168,76,0.6)">${esc(CFG.empresa?.nome||'Ceará Planejados')}</div>
        </div>
      </div>`;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:680px;background:#fff;font-family:\'Outfit\',Arial,sans-serif;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(container, { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, width:680, windowWidth:680 });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfW = 210;
    const pdfH = (canvas.height * pdfW) / canvas.width;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format: pdfH > 297 ? [pdfW, pdfH] : 'a4' });
    doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);

    const nomeArquivo = `Orcamento_${numOrc}${cliente!=='—'?'_'+cliente.replace(/\s+/g,'_'):''}.pdf`;
    const pdfBlob = doc.output('blob');

    if (navigator.canShare && navigator.share) {
      try {
        const file = new File([pdfBlob], nomeArquivo, { type:'application/pdf' });
        if (navigator.canShare({ files:[file] })) {
          closeModal();
          await navigator.share({ files:[file], title:`Orçamento ${numOrc} — ${CFG.empresa?.nome||'Ceará Planejados'}` });
          return;
        }
      } catch(e) {}
    }
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    closeModal();

  } catch(err) {
    console.error('PDF multi erro:', err);
    if (btnPdf) btnPdf.innerHTML = btnOrig;
    alert('Erro ao gerar PDF: ' + err.message);
  }
}
