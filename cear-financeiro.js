// ════════════════════════════════════════════════════════════
// FINANCEIRO / PREÇOS
// ════════════════════════════════════════════════════════════

function renderFinanceiro(wrap) {
  const v  = CFG.vidros;
  const ac = CFG.acessorios;
  const co = CFG.comercial;
  const cr = CFG.correr;

  const secoes = [
    {
      titulo: '🔥 Vidros Temperados — 8mm',
      sub:    'Alta resistência · ' + Math.round(co.desconto_avista * 100) + '% desconto à vista',
      linhas: [
        ['Transparente',  formatBRL(v.temp_trans.preco) + '/m²'],
        ['Fumê',          formatBRL(v.temp_fume.preco)  + '/m²'],
        ['Serigrafado',   formatBRL(v.temp_serig.preco) + '/m²'],
        ['Jateado',       formatBRL(v.temp_jat.preco)   + '/m²'],
        ['Espelhado',     formatBRL(v.temp_esp.preco)   + '/m²'],
      ],
    },
    {
      titulo: '🔲 Vidros Comuns',
      sub:    'Uso residencial · Recorte ' + formatBRL(co.recorte_por_m2) + '/m²',
      linhas: [
        ['Incolor 4mm',  formatBRL(v.com_4.preco)     + '/m²'],
        ['Incolor 6mm',  formatBRL(v.com_6.preco)     + '/m²'],
        ['Fumê 3mm',     formatBRL(v.com_fume3.preco) + '/m²'],
        ['Fumê 4mm',     formatBRL(v.com_fume4.preco) + '/m²'],
        ['Espelho 3mm',  formatBRL(v.esp_3.preco)     + '/m²'],
        ['Espelho 4mm',  formatBRL(v.esp_4.preco)     + '/m²'],
      ],
    },
    {
      titulo: '🔧 Kits e Ferragens',
      sub:    'Inclusos automaticamente conforme o produto',
      linhas: [
        ['Kit pivotante comum',  formatBRL(ac.kit_pivotante)],
        ['Kit pivotante jumbo',  formatBRL(ac.kit_jumbo)],
        ['Kit engenharia branco', formatBRL(co.kit_eng_branco) + '/m²'],
        ['Kit engenharia preto',  formatBRL(co.kit_eng_preto)  + '/m²'],
        ['Kit basculante',        formatBRL(ac.kit_basculante)],
        ['Roldana',               formatBRL(co.roldana) + '/un'],
      ],
    },
    {
      titulo: '🪝 Acessórios Avulsos',
      sub:    'Adicionados automaticamente por produto',
      linhas: [
        ['Fechadura VP',       formatBRL(cr.fechadura)],
        ['Fechadura VV',       formatBRL(ac.fechadura_vv)],
        ['Puxador',            formatBRL(ac.puxador)],
        ['Fixador',            formatBRL(ac.fixador)],
        ['Bate-fecha VP',      formatBRL(ac.bate_vp)],
        ['Bate-fecha VV',      formatBRL(ac.bate_vv)],
        ['Mola hidráulica',    formatBRL(co.mola_hidraulica)],
        ['Cantoneira alumínio', formatBRL(co.cantoneira_por_m) + '/m'],
        ['PU (poliuretano)',    formatBRL(co.pu_por_m) + '/m'],
      ],
    },
  ];

  const descPct   = Math.round(co.desconto_avista * 100);
  const freteKm   = co.frete_gratis_km;
  const freteExtra = formatBRL(co.frete_por_km_extra);

  wrap.innerHTML = `
    <div>
      <div class="hero"><div class="hero-ttl">💎 Tabela de Preços</div><div class="hero-sub">Valores por m² — ${esc(CFG.empresa.nome)}</div></div>
      <div class="section">
        ${secoes.map(s => `
          <div class="price-section">
            <div class="price-section-header"><h3>${s.titulo}</h3><p>${s.sub}</p></div>
            <div class="card" style="padding:4px 12px">
              <table class="tbl"><tbody>
                <tr><th>Tipo</th><th style="text-align:right">Valor</th></tr>
                ${s.linhas.map(([nome, val]) => `<tr><td>${nome}</td><td style="text-align:right">${val}</td></tr>`).join('')}
              </tbody></table>
            </div>
          </div>
        `).join('')}
        <div class="card" style="background:linear-gradient(135deg,rgba(58,158,106,.08),rgba(201,168,76,.05));border-color:rgba(58,158,106,.2)">
          <div style="font-size:.72rem;font-weight:700;color:var(--grn);margin-bottom:10px">💚 Condições de Pagamento</div>
          <div style="font-size:.74rem;color:var(--t3);line-height:1.8">
            • <b style="color:var(--t2)">Desconto à vista:</b> ${descPct}% nos vidros temperados e ferragens<br>
            • <b style="color:var(--t2)">Parcelamento:</b> até 6x sem juros<br>
            • <b style="color:var(--t2)">Cartão:</b> pode acrescentar taxas sobre total<br>
            • <b style="color:var(--t2)">Padrão:</b> 50% entrada + 50% na entrega<br>
            • <b style="color:var(--t2)">Frete:</b> grátis até ${freteKm} km · ${freteExtra}/km adicional
          </div>
        </div>
      </div>
      <div style="height:80px"></div>
    </div>
  `;
}


