// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function formatBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2 });
}

function calcularOrcamento({ tipo, larg, alt, vidro, accs, km, folhasCorrer, pivFolhas, kitPivotante, temFixo, fixoLarg, temBandeirola, bandH, temMola, puxadoresQtd, janelaFolhas, kitCor, molaQtd, boxTipo, largB, puxadoresCorrerQtd, state }) {
  if (!larg || !alt || isNaN(larg) || isNaN(alt)) return null;
  const linhas = []; let total = 0, descontoBase = 0;
  const area = (larg/100)*(alt/100);
  const vidroObj = VIDROS[vidro];

  // ── PORTA DE CORRER — kit engenharia por m² ───────────────
  if (tipo === 'correr') {
    const nFolhas = Number(folhasCorrer) || 2;
    const nMoveis = CORRER_MOVEIS[nFolhas] ?? 2;
    const nFixas  = nFolhas - nMoveis;
    const co      = CFG.comercial;
    const isPreto = kitCor === 'preto';

    // Vidro
    if (vidroObj) {
      const valVidro = area * vidroObj.preco;
      linhas.push({ nome: 'Vidro ' + vidroObj.nome, valor: valVidro });
      total += valVidro;
      if (vidroObj.temperado) descontoBase += valVidro;
    }

    // Kit engenharia (alumínios + trilhos + perfis)
    // +R$10/m² quando há 2 móveis (cadeirinha no encontro)
    const kitM2 = (isPreto ? co.kit_eng_preto : co.kit_eng_branco)
                + (nMoveis >= 2 ? co.kit_eng_extra : 0);
    const valKit = area * kitM2;
    linhas.push({ nome: 'Kit engenharia ' + (isPreto?'preto':'branco')
                + (nMoveis>=2?' (+R$'+co.kit_eng_extra+'/m² cadeirinha)':'')
                + ' (' + kitM2 + '/m²)', valor: valKit });
    total += valKit;

    // Roldanas: 2 por folha móvel
    const nRoldanas = nMoveis * 2;
    const valRoldanas = nRoldanas * co.roldana;
    linhas.push({ nome: 'Roldanas ×' + nRoldanas, valor: valRoldanas });
    total += valRoldanas;

    // Fechadura VP ou VV
    const vpvv   = nMoveis <= 1 ? 'VP' : 'VV';
    const fPreco = nMoveis <= 1 ? CFG.correr.fechadura : (CFG.acessorios?.fechadura_vv || 180);
    linhas.push({ nome: 'Fechadura ' + vpvv, valor: fPreco });
    total += fPreco;
    descontoBase += fPreco;

    // Puxador (opcional, 1 ou 2)
    if (accs && accs.puxador) {
      const nPux = Number(puxadoresCorrerQtd) || 1;
      const valPux = nPux * 100;
      linhas.push({ nome: 'Puxador ×' + nPux, valor: valPux });
      total += valPux;
      descontoBase += valPux;
    }

    // Frete
    const kmNum = parseFloat(km) || 0;
    let frete = 0;
    if (kmNum > FRETE_GRATIS_KM) frete = (kmNum-FRETE_GRATIS_KM) * FRETE_POR_KM_EXTRA;
    linhas.push({ nome: 'Frete (' + kmNum + ' km)', valor: frete });
    total += frete;

    const totalAvista = total - (descontoBase * DESCONTO_AVISTA);
    return { linhas, total, totalAvista, nFolhas, nMoveis, nFixas };
  }

  // ── JANELA — kit engenharia por m² ─────────────────────────
  if (tipo === 'janela') {
    const nFj    = Number(janelaFolhas) || (larg<=120?2:4);
    const nMj    = nFj===4?2:1;
    const co     = CFG.comercial;
    const isPreto= kitCor === 'preto';

    // Vidro
    if (vidroObj) {
      const valVidro = area * vidroObj.preco;
      linhas.push({ nome: 'Vidro ' + vidroObj.nome, valor: valVidro });
      total += valVidro;
      if (vidroObj.temperado) descontoBase += valVidro;
    }

    // Kit engenharia (+R$10/m² em 4 folhas)
    const kitM2j = (isPreto ? co.kit_eng_preto : co.kit_eng_branco)
                 + (nFj === 4 ? co.kit_eng_extra : 0);
    const valKitJ = area * kitM2j;
    linhas.push({ nome: 'Kit engenharia ' + (isPreto?'preto':'branco')
                + (nFj===4?' (+R$'+co.kit_eng_extra+'/m² 4 folhas)':'')
                + ' (' + kitM2j + '/m²)', valor: valKitJ });
    total += valKitJ;

    // Roldanas: 2 por folha móvel
    const nRolJ = nMj * 2;
    const valRolJ = nRolJ * co.roldana;
    linhas.push({ nome: 'Roldanas ×' + nRolJ, valor: valRolJ });
    total += valRolJ;

    // Bate-fecha VP ou VV
    const bfPreco = nFj===4 ? (CFG.acessorios?.bate_vv||80) : (CFG.acessorios?.bate_vp||50);
    const bfNome  = nFj===4 ? 'Bate-fecha VV' : 'Bate-fecha VP';
    linhas.push({ nome: bfNome, valor: bfPreco });
    total += bfPreco;
    descontoBase += bfPreco;

    // Frete
    const kmNumJ = parseFloat(km) || 0;
    let freteJ = 0;
    if (kmNumJ > FRETE_GRATIS_KM) freteJ = (kmNumJ-FRETE_GRATIS_KM) * FRETE_POR_KM_EXTRA;
    linhas.push({ nome: 'Frete (' + kmNumJ + ' km)', valor: freteJ });
    total += freteJ;

    const totalAvistaJ = total - (descontoBase * DESCONTO_AVISTA);
    return { linhas, total, totalAvista: totalAvistaJ };
  }

  // ── DEMAIS TIPOS ────────────────────────────────────────────
  if (vidroObj) {
    const val = area * vidroObj.preco;
    linhas.push({ nome:vidroObj.nome + (tipo==='pivotante'&&(pivFolhas||1)>1?' (2 folhas)':''), valor:val });
    total += val;
    if (vidroObj.temperado) descontoBase += val * DESCONTO_AVISTA;

    // Fixo lateral
    if (tipo === 'pivotante' && temFixo && fixoLarg > 0) {
      const areaFixo = (fixoLarg/100) * (alt/100);
      const valFixo = areaFixo * vidroObj.preco;
      linhas.push({ nome:'Vidro fixo lateral (' + fixoLarg + 'cm)', valor:valFixo });
      total += valFixo;
      if (vidroObj.temperado) descontoBase += valFixo * DESCONTO_AVISTA;
      // PU do fixo
      const perFixo = 2*(fixoLarg/100 + alt/100);
      const valPU = perFixo * (CFG.comercial.pu_por_m || 70);
      linhas.push({ nome:'PU fixo lateral (' + perFixo.toFixed(1) + 'm)', valor:valPU });
      total += valPU;
    }

    // Bandeirola
    if (tipo === 'pivotante' && temBandeirola && bandH > 0) {
      const areaBand = (larg/100) * (bandH/100);
      const valBand = areaBand * vidroObj.preco;
      linhas.push({ nome:'Bandeirola (' + bandH + 'cm)', valor:valBand });
      total += valBand;
      if (vidroObj.temperado) descontoBase += valBand * DESCONTO_AVISTA;
      const perBand = 2*(larg/100 + bandH/100);
      const valPUB = perBand * (CFG.comercial.pu_por_m || 70);
      linhas.push({ nome:'PU bandeirola (' + perBand.toFixed(1) + 'm)', valor:valPUB });
      total += valPUB;
    }
  }
  // Mola hidráulica — molaQtd: 0, 1 ou 2
  if (tipo === 'pivotante' && (molaQtd||0) > 0) {
    const molaPreco = (CFG.comercial.mola_hidraulica || 500) * (molaQtd||1);
    linhas.push({ nome:'Mola Hidráulica ×' + (molaQtd||1), valor: molaPreco });
    total += molaPreco;
    descontoBase += molaPreco;
  }

  // Pivotante: usa lista customizada em vez de ACESSORIOS_CONFIG
  if (tipo === 'pivotante') {
    // Kit (comum ou jumbo) — 2 folhas = 2 kits
    const nKits    = (pivFolhas||1) === 2 ? 2 : 1;
    const kitUnit  = kitPivotante === 'jumbo' ? 350 : 150;
    const kitPreco = kitUnit * nKits;
    const kitNome  = kitPivotante === 'jumbo'
      ? 'Kit Jumbo ×' + nKits
      : 'Kit Pivotante ×' + nKits;
    linhas.push({ nome: kitNome, valor: kitPreco });
    total += kitPreco;
    descontoBase += kitPreco;

    // Puxador
    if (accs && accs.puxador) {
      const nPux = Number(puxadoresQtd) || 1;
      const valPux = nPux * 100;
      linhas.push({ nome: 'Puxador ×' + nPux, valor: valPux });
      total += valPux;
      descontoBase += valPux;
    }

    // Fixador
    if (accs && accs.fixador) {
      linhas.push({ nome: 'Fixador', valor: 60 });
      total += 60;
      descontoBase += 60;
    }

    // Ferrolho — obrigatório em 2 folhas (2 unidades)
    if ((pivFolhas||1) === 2) {
      linhas.push({ nome: 'Ferrolho (2×)', valor: 120 });
      total += 120;
      descontoBase += 120;
    }

    // Contra fechadura (2 folhas)
    if ((pivFolhas||1) === 2) {
      linhas.push({ nome: 'Contra fechadura', valor: 50 });
      total += 50;
      descontoBase += 50;
    }
  } else {
  
  // ── TÚMULO / JAZIGO ────────────────────────────────────────
  if (tipo === 'tumulo') {
    const st       = state || {};
    const tt       = st.tumuTipo  || 'tumulo_completo';
    const esp      = Number(st.tumuEsp  || 2);           // espessura cm
    const matKey   = st.tumuMat   || 'granito_cinza';
    const temFundo = !!st.tumuFundo;
    const fatores  = !!st.tumuFator;                     // +10% perda de corte
    const mat      = (CFG.tumulo?.materiais?.[matKey]) ?? { nome:'Granito Cinza', preco:350 };
    const precoM2  = mat.preco * (esp >= 3 ? 1.20 : 1.0);

    // Dimensões do vão (cm → m)
    const C = Number(st.tumuComp || 210) / 100;  // comprimento (ao longo do corpo)
    const L = Number(st.tumuLarg || 90)  / 100;  // largura
    const H = Number(st.tumuAlt  || 60)  / 100;  // altura visível acima do solo

    // Dimensões reais das peças na montagem padrão brasileira:
    // Frontão vai cheio (L × H), laterais ficam entre frontão e fundo (C × H).
    // Tampo assenta sobre tudo (C + 2×esp_m × L + 2×esp_m).
    const espM = esp / 100;

    // ── Definir peças por tipo ──────────────────────────────
    const pecas = [];  // { nome, comp_cm, larg_cm, area_m2, obs }
    function peca(nome, cCm, lCm, obs) {
      pecas.push({ nome, cCm, lCm, area: (cCm/100)*(lCm/100), obs: obs||'' });
    }

    if (tt === 'frontao') {
      // Só o frontão / tampa de jazigo
      peca('Frontão', L*100, H*100, 'frente do túmulo ou tampa de jazigo');

    } else if (tt === 'revestimento') {
      // Frontão + Tampo (revestimento básico de carneira existente)
      peca('Tampo',    (C + 2*espM)*100, (L + 2*espM)*100, 'assenta sobre as paredes, +'+esp+'cm em cada lado');
      peca('Frontão',  L*100, H*100);

    } else if (tt === 'tumulo_completo') {
      // Revestimento completo: Tampo + Frontão + 2 Laterais + opcional Fundo
      // Montagem: frontão e fundo cheios; laterais se encaixam entre eles
      const lateralComp = C;  // lateral vai do fundo ao frontão (inclusive), simplificado
      peca('Tampo',       (C + 2*espM)*100, (L + 2*espM)*100, 'cobre o topo, sobressai '+esp+'mm');
      peca('Frontão',     L*100, H*100, 'face principal (visitante)');
      peca('Lateral dir.', lateralComp*100, H*100);
      peca('Lateral esq.', lateralComp*100, H*100);
      if (temFundo) peca('Fundo', L*100, H*100, 'face traseira');

    } else if (tt === 'jazigo_frontao') {
      // Jazigo vertical — só a tampa frontal da gaveta
      // C = profundidade do nicho (não visível), L = boca larg, H = boca alt
      peca('Tampa da gaveta', L*100, H*100, 'frontão externo do nicho');

    } else if (tt === 'jazigo_2') {
      // 2 gavetas empilhadas — 2 tampas frontais independentes
      peca('Tampa gaveta superior', L*100, H*100);
      peca('Tampa gaveta inferior', L*100, H*100);
      // Rodapé entre as gavetas
      peca('Rodapé entre gavetas', L*100, (espM*3)*100, 'separador entre tampas');

    } else if (tt === 'jazigo_familia') {
      // Jazigo de família — múltiplas gavetas (qtd configurável)
      const nGav = Number(st.tumuGavetas || 3);
      for (let g = 1; g <= nGav; g++) {
        peca('Tampa gaveta ' + g, L*100, H*100);
      }
      peca('Rodapé base', L*100, (espM*4)*100, 'base do jazigo');

    } else if (tt === 'mausoleu') {
      // Mausoléu: paredes laterais + fundo + teto + frontão
      peca('Parede lateral dir.', C*100, H*100);
      peca('Parede lateral esq.', C*100, H*100);
      peca('Parede fundo',       L*100, H*100);
      peca('Laje de cobertura',  (C + 2*espM)*100, (L + 2*espM)*100);
      peca('Frontão',            L*100, H*100);
      if (temFundo) peca('Piso interno', C*100, L*100, 'revestimento do piso');
    }

    // ── Cálculo de material ─────────────────────────────────
    const areaLiq = pecas.reduce((s,p) => s + p.area, 0);
    const fatorPerda = fatores ? 1.10 : 1.0;
    const areaTotal  = areaLiq * fatorPerda;  // área com perda de corte

    pecas.forEach(function(p) {
      const areaComPerda = p.area * fatorPerda;
      const val = areaComPerda * precoM2;
      const dimStr = p.cCm.toFixed(0) + '×' + p.lCm.toFixed(0) + ' cm = ' + (p.area).toFixed(2) + ' m²' + (fatores ? ' (+10%)' : '');
      linhas.push({ nome: p.nome + ' (' + dimStr + ')', valor: val });
      total += val;
    });

    // Subtotal material
    linhas.push({ nome: '— ' + mat.nome + ' ' + esp + 'cm | Área: ' + areaTotal.toFixed(2) + ' m² × R$' + precoM2.toFixed(0) + '/m²', valor: 0 });

    // ── Acessórios e serviços ───────────────────────────────
    const acssMap  = CFG.tumulo?.acss ?? {};
    const tumuAcss = st.tumuAcss || {};
    let areaInstM2 = areaTotal;

    Object.keys(tumuAcss).forEach(function(id) {
      if (!tumuAcss[id]) return;
      if (id === 'instalacao_m2') return;  // tratado separado
      const a = acssMap[id];
      if (!a) return;
      linhas.push({ nome: a.nome, valor: a.preco });
      total += a.preco;
      descontoBase += a.preco;
    });

    // Instalação por m²
    if (tumuAcss.instalacao_m2) {
      const insUnit  = acssMap.instalacao_m2?.preco ?? 80;
      const insTotal = insUnit * areaInstM2;
      linhas.push({ nome: 'Instalação no cemitério (' + areaInstM2.toFixed(2) + ' m² × R$' + insUnit + '/m²)', valor: insTotal });
      total += insTotal;
    }

    // Frete
    const kmN = parseFloat(km) || 0;
    if (kmN > FRETE_GRATIS_KM) {
      const frete = (kmN - FRETE_GRATIS_KM) * FRETE_POR_KM_EXTRA;
      linhas.push({ nome: 'Frete (' + kmN + ' km)', valor: frete });
      total += frete;
    }

    return { linhas, total, totalAvista: total - descontoBase * DESCONTO_AVISTA };
  }

  // ── Acessórios por tipo (tabela genérica)
  (ACESSORIOS_CONFIG[tipo] || []).forEach(a => {
      const ativo = accs[a.id] ?? a.obrig;
      if (!ativo) return;
      let val = 0;
      if (a.preco !== null && a.preco !== undefined) { val = a.preco; }
      else {
        if (tipo === 'janela')  val = (larg/100) * 100;
        if (tipo === 'box') {
          const coB = CFG.comercial;
          const isPretoB = kitCor==='preto';
          const bt = boxTipo || 'conv';
          if (bt === 'fixo') {
            // Só fixo: PU no perímetro
            val = 0; // vidro já calculado acima
            const perim = 2*(larg/100 + alt/100);
            const valPU = perim * (coB.pu_por_m || 70);
            linhas.push({ nome:'PU perímetro (' + perim.toFixed(1) + 'm)', valor:valPU }); total+=valPU;
          } else if (bt === 'canto') {
            // Box de canto: área A + área B, +R$100/m² no kit
            const areaB = (largB/100)*(alt/100);
            const areaTotal = area + areaB;
            const kitM2Canto = (isPretoB?coB.kit_eng_preto:coB.kit_eng_branco) + 100;
            val = areaTotal * kitM2Canto;
            linhas.push({ nome:'Vidro lado B (' + largB + '×' + alt + 'cm)', valor: areaB * vidroObj.preco }); total += areaB * vidroObj.preco;
            const rolCanto = 4 * coB.roldana;
            linhas.push({ nome:'Roldanas ×4', valor:rolCanto }); total+=rolCanto;
          } else {
            // conv, 3p, 4p
            const nMovBox = bt==='4p'?2:1;
            const kitM2B = (isPretoB?coB.kit_eng_preto:coB.kit_eng_branco) + (nMovBox>=2?coB.kit_eng_extra:0);
            val = area * kitM2B;
            const nRolB = nMovBox * 2;
            const rolB = nRolB * coB.roldana;
            linhas.push({ nome:'Roldanas ×'+nRolB, valor:rolB }); total+=rolB;
          }
        }
        if (tipo === 'espelho' && a.id === 'botoes') val = larg >= 60 ? 4*15 : 0;
        if (tipo === 'comum'   && a.id === 'recorte') val = area * 10;
      }
      linhas.push({ nome:a.nome, valor:val });
      total += val;
    });
  }
  const kmNum = parseFloat(km) || 0;
  let frete = 0;
  if (kmNum > FRETE_GRATIS_KM) frete = (kmNum - FRETE_GRATIS_KM) * FRETE_POR_KM_EXTRA;
  linhas.push({ nome:`Frete (${kmNum} km)`, valor:frete });
  total += frete;
  return { linhas, total, totalAvista: total - descontoBase };
}

function gerarTextoWpp({ cliente, tipo, larg, alt, vidro, resultado, folhasCorrer }) {
  if (!resultado) return '';
  const vidroObj = VIDROS[vidro];
  const dataStr = new Date().toLocaleDateString('pt-BR');
  let txt = `*Orçamento — Ceará Planejados*\n📅 ${dataStr}\n`;
  if (cliente) txt += `👤 Cliente: ${cliente}\n`;
  txt += `\n📦 Produto: *${TIPO_LABEL[tipo]||tipo}*\n📐 Medidas: ${larg} x ${alt} cm\n`;
  if (tipo === 'correr' && resultado.nFolhas) {
    const nF = resultado.nFolhas;
    const nM = resultado.nMoveis;
    const nFx = resultado.nFixas;
    txt += `🔲 Configuração: *${nF} folha${nF>1?'s':''}`;
    if (nFx > 0) txt += ` (${nM} móve${nM>1?'is':'l'} + ${nFx} fixa${nFx>1?'s':''})`;
    else txt += ` móve${nM>1?'is':'l'}`;
    txt += `*\n`;
  }
  if (vidroObj) txt += `🔷 Vidro: ${vidroObj.nome}\n`;
  txt += `\n*Composição:*\n`;
  resultado.linhas.forEach(l => txt += `• ${l.nome}: ${formatBRL(l.valor)}\n`);
  txt += `\n💰 *Total: ${formatBRL(resultado.total)}*\n💚 À vista (10% off): *${formatBRL(resultado.totalAvista)}*\n\n_Orçamento gerado pelo app Ceará Planejados_`;
  return txt;
}

function formatData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
}

function corTipo(tipo) {
  const map = {
    pivotante: { bg:'rgba(212,175,55,0.1)',  brd:'rgba(212,175,55,0.25)' },
    correr:    { bg:'rgba(80,160,220,0.1)',  brd:'rgba(80,160,220,0.25)' },
    janela:    { bg:'rgba(100,200,140,0.1)', brd:'rgba(100,200,140,0.25)' },
    box:       { bg:'rgba(160,120,220,0.1)', brd:'rgba(160,120,220,0.25)' },
    espelho:   { bg:'rgba(220,180,80,0.1)',  brd:'rgba(220,180,80,0.25)' },
    guarda:    { bg:'rgba(220,100,100,0.1)', brd:'rgba(220,100,100,0.25)' },
    basculante:{ bg:'rgba(100,200,255,0.1)', brd:'rgba(100,200,255,0.25)' },
    comum:     { bg:'rgba(180,180,180,0.1)', brd:'rgba(180,180,180,0.25)' },
  };
  return map[tipo] || { bg:'rgba(201,168,76,0.1)',brd:'rgba(201,168,76,0.2)' };
}

// ════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id:'home',       label:'Início',    icon:'🏠', cta:false },
  { id:'orc',        label:'Orçamento', icon:'🧮', cta:true  },
  { id:'financeiro', label:'Preços',    icon:'💎', cta:false },
  { id:'historico',  label:'Histórico', icon:'📂', cta:false },
  { id:'clientes',   label:'Clientes',  icon:'👥', cta:false },
  { id:'config',     label:'Config.',   icon:'ℹ️', cta:false },
];

let paginaAtiva = 'home';

function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV_ITEMS.map(it => `
    <button class="ni${it.cta?' ni-cta':''}${paginaAtiva===it.id?' on':''}" onclick="navTo('${it.id}')" aria-label="${it.label}">
      <div class="ni-ic-wrap"><span class="ni-i">${it.icon}</span></div>
      <span class="ni-l">${it.label}</span>
    </button>
  `).join('');
}

function navTo(pg) {
  if (pg === paginaAtiva) return;
  paginaAtiva = pg;
  buildNav();
  renderPage();
}

// ════════════════════════════════════════════════════════════
// RENDER ROUTER
// ════════════════════════════════════════════════════════════

function renderPage() {
  const wrap = document.getElementById('pgWrap');
  wrap.className = 'pg';
  // Force reflow para restart animation
  void wrap.offsetWidth;
  switch(paginaAtiva) {
    case 'home':       renderHome(wrap); break;
    case 'orc':        renderOrc(wrap); break;
    case 'financeiro': renderFinanceiro(wrap); break;
    case 'historico':  renderHistorico(wrap); break;
    case 'clientes':   renderClientes(wrap); break;
    case 'config':     renderConfig(wrap); break;
  }
  // Scroll to top
  document.getElementById('pages').scrollTop = 0;
}

