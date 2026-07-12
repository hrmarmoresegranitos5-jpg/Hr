// ════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════

function renderConfig(wrap) {
  const e  = CFG.empresa;
  const v  = CFG.vidros;
  const cr = CFG.correr;
  const co = CFG.comercial;

  // Campo numérico empilhado (label em cima, input embaixo)
  function campo(key, val, label, pfx, sfx, step) {
    const isPct = sfx === '%';
    const displayVal = isPct ? +(val * 100).toFixed(1) : val;
    return `<div class="cfgc">
      <div class="cfgc-lbl">${label}</div>
      <div class="cfgc-inp-row">
        ${pfx ? `<span class="cfgc-pfx">${pfx}</span>` : ''}
        <input class="cfgc-inp" type="number" inputmode="decimal"
               data-key="${key}" data-pct="${isPct ? 1 : 0}"
               value="${displayVal}" step="${step || 'any'}" min="0"
               oninput="cfgMark()">
        ${sfx ? `<span class="cfgc-sfx">${sfx}</span>` : ''}
      </div>
    </div>`;
  }

  // Campo de texto
  function campoTxt(key, val, label, ph) {
    return `<div class="cfgc cfgc-full">
      <div class="cfgc-lbl">${label}</div>
      <input class="cfgc-inp cfgc-inp-txt" type="text"
             data-key="${key}" value="${esc(val)}"
             placeholder="${ph || ''}" oninput="cfgMark()">
    </div>`;
  }

  // Grade de 2 colunas
  function grade(items) {
    return `<div class="cfgc-grade">${items.join('')}</div>`;
  }

  // Seção com título
  function sec(icon, title, conteudo) {
    return `<div class="cfg-bloco">
      <div class="cfg-bloco-ttl"><span>${icon}</span>${title}</div>
      ${conteudo}
    </div>`;
  }

  wrap.innerHTML = `<div id="pgConfig">

    <div class="cfg-hero">
      <div class="cfg-hero-logo">CP</div>
      <div>
        <div class="cfg-hero-nm">${esc(e.nome)}</div>
        <div class="cfg-hero-sub">${esc(e.subtitulo)}</div>
      </div>
    </div>

    <div class="cfg-aviso">
      <span>⚡</span>
      <span>Altere os valores e toque em <strong>Salvar</strong> para aplicar</span>
    </div>

    ${sec('🏢', 'Empresa',
      campoTxt('empresa.nome',      e.nome,      'Nome da empresa',        'Ceará Planejados') +
      campoTxt('empresa.subtitulo', e.subtitulo, 'Subtítulo',              'Vidraçaria · Marcenaria') +
      campoTxt('empresa.whatsapp',  e.whatsapp,  'WhatsApp (só números)',  '5585999999999') +
      campoTxt('empresa.horario',   e.horario,   'Horário de atendimento', 'Seg–Sex 8h–18h') +
      campoTxt('empresa.pagamento', e.pagamento, 'Formas de pagamento',    'PIX · Cartão')
    )}

    ${sec('🔥', 'Vidros Temperados — R$/m²',
      grade([
        campo('vidros.temp_trans', v.temp_trans.preco, 'Transparente 8mm', 'R$', '/m²'),
        campo('vidros.temp_fume',  v.temp_fume.preco,  'Fumê 8mm',         'R$', '/m²'),
        campo('vidros.temp_serig', v.temp_serig.preco, 'Serigrafado 8mm',  'R$', '/m²'),
        campo('vidros.temp_jat',   v.temp_jat.preco,   'Jateado 8mm',      'R$', '/m²'),
        campo('vidros.temp_esp',   v.temp_esp.preco,   'Espelhado 8mm',    'R$', '/m²'),
      ])
    )}

    ${sec('🔷', 'Vidros Comuns — R$/m²',
      grade([
        campo('vidros.com_4',     v.com_4.preco,     'Incolor 4mm',  'R$', '/m²'),
        campo('vidros.com_6',     v.com_6.preco,     'Incolor 6mm',  'R$', '/m²'),
        campo('vidros.com_fume3', v.com_fume3.preco, 'Fumê 3mm',     'R$', '/m²'),
        campo('vidros.com_fume4', v.com_fume4.preco, 'Fumê 4mm',     'R$', '/m²'),
      ])
    )}

    ${sec('🪞', 'Espelhos — R$/m²',
      grade([
        campo('vidros.esp_3', v.esp_3.preco, 'Espelho 3mm', 'R$', '/m²'),
        campo('vidros.esp_4', v.esp_4.preco, 'Espelho 4mm', 'R$', '/m²'),
      ])
    )}

    ${sec('🔲', 'Porta de Correr — Componentes',
      grade([
        campo('correr.trilho_sup',   cr.trilho_sup,   'Trilho superior',  'R$', '/m'),
        campo('correr.guia_inf',     cr.guia_inf,     'Guia inferior',    'R$', '/m'),
        campo('correr.kit_carrinho', cr.kit_carrinho, 'Kit carrinho',     'R$', '/folha'),
        campo('correr.fechadura',    cr.fechadura,    'Fechadura VP',     'R$', '/un'),
        campo('correr.puxador',      cr.puxador,      'Puxador',          'R$', '/un'),
      ])
    )}

    ${sec('🔧', 'Kits e Ferragens',
      grade([
        campo('acessorios.kit_pivotante',  150, 'Kit Pivotante',    'R$', ''),
        campo('acessorios.kit_jumbo',      350, 'Kit Jumbo',        'R$', ''),
        campo('acessorios.kit_janela_2',   100, 'Janela 2 folhas',  'R$', ''),
        campo('acessorios.kit_janela_4',   110, 'Janela 4 folhas',  'R$', ''),
        campo('acessorios.kit_basculante', 150, 'Kit Basculante',   'R$', ''),
        campo('acessorios.puxador',        100, 'Puxador',          'R$', ''),
        campo('acessorios.fixador',         60, 'Fixador',          'R$', ''),
      ])
    )}

    ${sec('🔑', 'Fechaduras',
      grade([
        campo('acessorios.fechadura_vp',       150, 'VP (correr)',    'R$', ''),
        campo('acessorios.fechadura_vv',       180, 'VV (correr)',    'R$', ''),
        campo('acessorios.fechadura_macaret',  180, 'Maçaneta',       'R$', ''),
        campo('acessorios.contra_fechadura',    50, 'Contra (pivot)', 'R$', ''),
      ])
    )}

    ${sec('🪝', 'Bate-Fechas e Acessórios',
      grade([
        campo('acessorios.bate_vp',       50,                  'Bate-fecha VP', 'R$', ''),
        campo('acessorios.bate_vv',       80,                  'Bate-fecha VV', 'R$', ''),
        campo('comercial.botao_frances',  co.botao_frances,    'Botão francês', 'R$', '/un', 0.01),
        campo('comercial.botoes_quant',   co.botoes_quant,     'Qtd. botões',   '',   'un'),
      ])
    )}

    ${sec('⚙️', 'Instalações e Extras',
      grade([
        campo('comercial.mola_hidraulica',  co.mola_hidraulica,  'Mola hidráulica', 'R$', ''),
        campo('comercial.cantoneira_por_m', co.cantoneira_por_m, 'Cantoneira',      'R$', '/m'),
        campo('comercial.pu_por_m',         co.pu_por_m,         'PU',              'R$', '/m'),
        campo('comercial.recorte_por_m2',   co.recorte_por_m2,   'Recorte',         'R$', '/m²'),
        campo('comercial.box_por_m2',       co.box_por_m2,       'Box ferragens',   'R$', '/m²'),
      ])
    )}

    ${sec('💰', 'Comercial',
      grade([
        campo('comercial.desconto_avista',    co.desconto_avista,       'Desconto à vista',  '', '%', 0.1),
        campo('comercial.frete_gratis_km',    co.frete_gratis_km,       'Frete grátis até',  '', 'km'),
        campo('comercial.frete_por_km_extra', co.frete_por_km_extra,    'Frete extra',       'R$', '/km', 0.5),
        campo('comercial.validade_dias',      co.validade_dias||7,      'Validade orçamento','', 'dias'),
      ])
    )}

    <div class="cfg-footer-btns">
      <button class="cfg-btn-salvar" id="btnSalvarCfg" onclick="cfgSalvar()">
        💾 Salvar Configurações
      </button>
      <button class="cfg-btn-reset" onclick="cfgResetar()">
        ↺ Restaurar padrões
      </button>
    </div>

    <div style="height:90px"></div>
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

let _cfgDirty = false;
function cfgMark() {
  _cfgDirty = true;
  const btn = document.getElementById('btnSalvarCfg');
  if (btn) btn.classList.add('cfg-btn-dirty');
}

function cfgSalvar() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ceara_cfg') || '{}'); } catch(e) {}

  // Pre-seed: para cada namespace presente no CFG atual, garante que 'saved'
  // já tenha todas as chaves — assim subchaves não exibidas na tela não são apagadas.
  ['empresa','vidros','correr','comercial','acessorios'].forEach(ns => {
    if (CFG[ns] && typeof CFG[ns] === 'object') {
      saved[ns] = Object.assign({}, CFG[ns], saved[ns] || {});
    }
  });

  document.querySelectorAll('#pgConfig [data-key]').forEach(el => {
    const keys  = el.dataset.key.split('.');
    const isPct = el.dataset.pct === '1';
    const isTxt = el.type === 'text';
    let val = isTxt ? el.value.trim() : parseFloat(el.value);
    if (!isTxt && isNaN(val)) return;
    if (isPct) val = val / 100;
    if (!saved[keys[0]]) saved[keys[0]] = {};
    saved[keys[0]][keys[1]] = val;
  });

  saveCFG(saved);
  _cfgDirty = false;

  const btn = document.getElementById('btnSalvarCfg');
  if (btn) {
    btn.classList.remove('cfg-btn-dirty');
    btn.textContent = '✅ Salvo!';
    setTimeout(() => { btn.textContent = '💾 Salvar Configurações'; }, 2200);
  }
  histMostrarToast('✅ Configurações salvas!');
}

function cfgResetar() {
  if (!confirm('Restaurar todos os valores para os padrões da tabela oficial?')) return;
  resetCFG();
  const wrap = document.getElementById('mainContent');
  if (wrap) renderConfig(wrap);
  histMostrarToast('↺ Valores padrão restaurados');
}
