// ══════════════════════════════════════════════════════════════
// CATÁLOGO DE CUBAS v2 — VERSÃO RICA APRIMORADA
// HR Mármores e Granitos
// ══════════════════════════════════════════════════════════════

// ─── Estado global ────────────────────────────────────────────
var _catRicoFiltro  = 'todos';
var _catRicoOrdem   = 'padrao';
var _catRicoSearch  = '';
var _catRicoDetalhe = null;   // { cuba, tipo, idx } — cuba em detalhe
var _catRicoLista   = [];     // cache da lista filtrada (para navegação ←→)

// ─── Metadados ────────────────────────────────────────────────
var CUBA_META = {
  tramontina_prime: {
    destaque: true,
    badge: '⭐ Mais vendida',
    desc: 'Cuba inox de alta qualidade com acabamento acetinado. Fundo rebaixado anti-ruído, kit completo incluso. Ideal para cozinhas modernas e de alto padrão.',
    features: ['Aço inox 304 — 0,6mm de espessura','Acabamento acetinado premium','Fundo rebaixado anti-ruído','Kit válvula + sifão inclusos','Torneira inclusa no kit'],
    garantia: '5 anos',
    tipo_mat: 'Inox',
    marca_logo: 'TRAMONTINA',
  },
  meganox_gourmet: {
    badge: '👨‍🍳 Gourmet',
    desc: 'Cuba com tábua de corte integrada em bambu tratado. Dupla função: lavar e preparar alimentos no mesmo espaço. Acabamento escovado premium.',
    features: ['Aço inox escovado premium','Tábua de bambu certificado inclusa','Grade escorredor inox','Torneira inclusa no kit','60×42 cm — cabe panelas grandes'],
    garantia: '3 anos',
    tipo_mat: 'Inox',
    marca_logo: 'MEGANOX',
  },
  premium_304_6040: {
    badge: '💎 Premium',
    desc: 'Cuba quadrada de embutir em aço inox 304 grau alimentício. Cantos arredondados facilitam a limpeza. Acabamento espelhado de alto brilho.',
    features: ['Aço 304 grau alimentício','Dimensões: 60×40 cm','Profundidade 17 cm','Acabamento espelhado','Silicone vedante incluso'],
    garantia: '5 anos',
    tipo_mat: 'Inox',
    marca_logo: 'PREMIUM 304',
    destaque: true,
  },
  brinovar_5040: {
    badge: '🔲 Compacta',
    desc: 'Cuba de sobrepor com bordas altas. Perfeita para área de serviço, lavanderia e churrasqueira. Design minimalista e funcional.',
    features: ['50×40×20 cm','Bordas altas anti-respingo','Fundo com canaleta de escoamento','Uso interno e externo','Fácil instalação'],
    garantia: '2 anos',
    tipo_mat: 'Inox',
    marca_logo: 'BRINOVAR',
  },
  meranox_padrao: {
    badge: '✔ Custo-benefício',
    desc: 'Cuba inox padrão de excelente custo-benefício. Acabamento liso de fácil limpeza. Compatível com a maioria das bancadas existentes.',
    features: ['Aço inox 430','Acabamento polido liso','Kit sifão incluso','Medidas universais compatíveis'],
    garantia: '2 anos',
    tipo_mat: 'Inox',
    marca_logo: 'MERANOX',
  },
  escorredor_inox: {
    badge: '🫙 Complemento',
    desc: 'Módulo escorredor em inox para embutir ao lado da cuba principal. Drena água diretamente para o ralo da cuba. Acompanha qualquer modelo.',
    features: ['Inox 430 resistente','Superfície nervurada antiderrapante','Drenagem lateral integrada','Complemento universal'],
    garantia: '2 anos',
    tipo_mat: 'Inox',
    marca_logo: 'HR',
  },
  icasa_red: {
    badge: '🔴 Design Redonda',
    desc: 'Cuba redonda de louça esmaltada com bordas retas. Visual sofisticado para lavabos e banheiros de alto padrão. Peça que valoriza o ambiente.',
    features: ['Louça sanitária vitrificada','Diâmetro 37 cm','Altura 14 cm','Para embutir em balcão ou tampo','Acabamento esmaltado brilhante'],
    garantia: '3 anos',
    tipo_mat: 'Louça',
    marca_logo: 'ICASA',
  },
  beltempo_oval: {
    badge: '🥚 Oval Clássica',
    desc: 'Cuba oval de sobrepor para lavabo. Linhas suaves e elegantes para projetos contemporâneos e clássicos. Kit completo incluso.',
    features: ['Louça branca premium','60×43 cm','Para embutir em tampo','Inclui torneira e sifão','Certificação INMETRO'],
    garantia: '3 anos',
    tipo_mat: 'Louça',
    marca_logo: 'BELTEMPO',
  },
  lorenz_oval_emb: {
    badge: '✨ Luxo Europeu',
    desc: 'Cuba oval de embutir premium com acabamento texturizado. Design exclusivo europeu. Produto de vitrine para banheiros de alto padrão.',
    features: ['Porcelana premium importada','Oval 56×38 cm','Bordas ultra-finas','Disponível em branco e off-white','Certificação ISO 9001'],
    garantia: '5 anos',
    tipo_mat: 'Porcelana',
    marca_logo: 'LORENZ',
    destaque: true,
  },
  docol_red_emb: {
    badge: '🔴 Redonda Clássica',
    desc: 'Cuba redonda de embutir com acabamento vitrificado. Clássica e atemporal, encaixa em qualquer estilo de banheiro ou lavabo.',
    features: ['Louça vitrificada resistente','Diâmetro 42 cm','Para embutir','Branco clássico','Fácil higienização'],
    garantia: '3 anos',
    tipo_mat: 'Louça',
    marca_logo: 'DOCOL',
  },
  deca_quad_emb: {
    badge: '⬛ Geométrica',
    desc: 'Cuba quadrada de embutir em louça de alta qualidade. Linhas retas modernas para lavabos e banheiros contemporâneos.',
    features: ['Louça sanitária branca','44×44 cm','Para embutir','Design geométrico moderno','Superfície antibacteriana'],
    garantia: '3 anos',
    tipo_mat: 'Louça',
    marca_logo: 'DECA',
  },
};

// ─── Mapeamento foto ──────────────────────────────────────────
var CUBA_FOTO_MAP = {
  tramontina_prime: 'tramontina_prime',
  meganox_gourmet:  'meganox_gourmet',
  premium_304_6040: 'premium_304_6040',
  brinovar_5040:    'brinovar_5040',
  meranox_padrao:   'meranox_padrao',
  escorredor_inox:  'escorredor_inox',
  icasa_red:        'icasa_red',
  beltempo_oval:    'beltempo_oval',
  lorenz_oval_emb:  'lorenz_oval_emb',
  docol_red_emb:    'docol_red_emb',
  deca_quad_emb:    'deca_quad_emb',
};

// ─── Helpers ──────────────────────────────────────────────────
function _cubaImg(cuba) {
  if (cuba.photo && cuba.photo.startsWith('data:')) return cuba.photo;
  if (typeof CUBA_IMGS !== 'undefined') {
    var key = CUBA_FOTO_MAP[cuba.id] || cuba.id;
    if (CUBA_IMGS[key]) return CUBA_IMGS[key];
  }
  return null;
}

function _cubaMeta(cuba) {
  return CUBA_META[cuba.id] || {};
}

function _escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function _cubaPrecoFmt(cuba) {
  return cuba.pr > 0 ? 'R$\u00a0' + cuba.pr.toLocaleString('pt-BR') : 'Sob consulta';
}

// ─── Lista filtrada (com cache para navegação ←→) ─────────────
function _cubaListaFiltrada() {
  var coz = (CFG.coz || []).map(function(c){ return {cuba:c, tipo:'coz'}; });
  var lav = (CFG.lav || [])
              .filter(function(c){ return c.tipo !== 'Esculpida'; })
              .map(function(c){ return {cuba:c, tipo:'lav'}; });

  var lista = _catRicoFiltro === 'coz' ? coz
            : _catRicoFiltro === 'lav' ? lav
            : coz.concat(lav);

  if (_catRicoSearch.trim()) {
    var q = _catRicoSearch.toLowerCase();
    lista = lista.filter(function(it){
      return (it.cuba.nm||'').toLowerCase().includes(q)
          || (it.cuba.brand||'').toLowerCase().includes(q)
          || (it.cuba.dim||'').toLowerCase().includes(q)
          || (_cubaMeta(it.cuba).tipo_mat||'').toLowerCase().includes(q);
    });
  }

  if (_catRicoOrdem === 'preco_asc')  lista.sort(function(a,b){ return (a.cuba.pr||0)-(b.cuba.pr||0); });
  if (_catRicoOrdem === 'preco_desc') lista.sort(function(a,b){ return (b.cuba.pr||0)-(a.cuba.pr||0); });
  if (_catRicoOrdem === 'nome')       lista.sort(function(a,b){ return (a.cuba.nm||'').localeCompare(b.cuba.nm||''); });

  _catRicoLista = lista; // cache
  return lista;
}

// ══════════════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════════════════════
function buildCubaListRico() {
  var wrap = document.getElementById('cubaListWrap');
  if (!wrap) return;

  if (_catRicoDetalhe) {
    wrap.innerHTML = _renderDetalhe(_catRicoDetalhe.cuba, _catRicoDetalhe.tipo, _catRicoDetalhe.idx);
    return;
  }

  var lista = _cubaListaFiltrada();
  var total = lista.length;
  var cozN  = (CFG.coz||[]).length;
  var lavN  = (CFG.lav||[]).filter(function(c){ return c.tipo!=='Esculpida'; }).length;

  var h = '';

  // ── CABEÇALHO STICKY ──────────────────────────────────────
  h += '<div id="_catRicoHdr" style="position:sticky;top:0;z-index:10;'
    + 'background:var(--s1);padding:10px 0 6px;margin-bottom:4px;">';

  // Barra de busca
  h += '<div style="position:relative;margin-bottom:8px;">'
    + '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);'
    + 'color:var(--t3);font-size:.85rem;pointer-events:none;">🔍</span>'
    + '<input type="text" id="catRicoSearch" placeholder="Buscar por nome, marca ou medida…" '
    + 'value="' + _escHtml(_catRicoSearch) + '" '
    + 'oninput="_catRicoSearch=this.value;buildCubaListRico();" '
    + 'style="width:100%;box-sizing:border-box;padding:10px 36px 10px 34px;border-radius:11px;'
    + 'border:1px solid var(--bd2);background:var(--s3);color:var(--tx);'
    + 'font-family:Outfit,sans-serif;font-size:.82rem;outline:none;">';
  // Botão limpar busca (aparece só quando há texto)
  if (_catRicoSearch) {
    h += '<button onclick="_catRicoSearch=\'\';buildCubaListRico();" '
      + 'style="position:absolute;right:10px;top:50%;transform:translateY(-50%);'
      + 'background:none;border:none;color:var(--t3);cursor:pointer;font-size:.9rem;padding:2px 4px;">✕</button>';
  }
  h += '</div>';

  // Filtros por categoria (pills)
  h += '<div style="display:flex;gap:6px;margin-bottom:8px;overflow-x:auto;'
    + 'padding-bottom:2px;scrollbar-width:none;">';

  var filtros = [
    {k:'todos', lbl:'🏠 Todas',         count: cozN + lavN},
    {k:'coz',   lbl:'🍳 Cozinha',       count: cozN},
    {k:'lav',   lbl:'🚿 Banhe./Lavabo', count: lavN},
  ];
  filtros.forEach(function(f) {
    var ativo = _catRicoFiltro === f.k;
    h += '<button onclick="_catRicoFiltro=\'' + f.k + '\';buildCubaListRico();" '
      + 'style="flex-shrink:0;padding:6px 14px;border-radius:20px;cursor:pointer;'
      + 'font-family:Outfit,sans-serif;font-size:.75rem;white-space:nowrap;transition:all .15s;'
      + 'border:1px solid ' + (ativo ? 'var(--gold)' : 'var(--bd2)') + ';'
      + 'background:' + (ativo ? 'var(--gdim)' : 'transparent') + ';'
      + 'color:' + (ativo ? 'var(--gold2)' : 'var(--t2)') + ';'
      + 'font-weight:' + (ativo ? '700' : '400') + ';">'
      + f.lbl + ' <span style="opacity:.45;font-size:.68rem;">(' + f.count + ')</span></button>';
  });
  h += '</div>';

  // Linha de status + ordenação
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">';

  // Texto de status
  var statusTxt = _catRicoSearch
    ? total + ' resultado' + (total!==1?'s':'') + ' para "<strong>' + _escHtml(_catRicoSearch) + '</strong>"'
    : total + ' modelo' + (total!==1?'s':'');
  h += '<span style="font-size:.7rem;color:var(--t3);">' + statusTxt + '</span>';

  // Select ordenação
  h += '<select onchange="_catRicoOrdem=this.value;buildCubaListRico();" '
    + 'style="background:var(--s3);border:1px solid var(--bd2);border-radius:8px;'
    + 'padding:5px 8px;color:var(--t2);font-family:Outfit,sans-serif;font-size:.72rem;outline:none;cursor:pointer;">';
  [{k:'padrao',lbl:'Padrão'},{k:'preco_asc',lbl:'Menor preço'},{k:'preco_desc',lbl:'Maior preço'},{k:'nome',lbl:'A–Z'}]
    .forEach(function(o){
      h += '<option value="' + o.k + '"' + (_catRicoOrdem===o.k?' selected':'') + '>' + o.lbl + '</option>';
    });
  h += '</select>';
  h += '</div>';

  h += '</div>'; // fim sticky hdr

  // ── GRID ────────────────────────────────────────────────
  if (total === 0) {
    h += '<div style="text-align:center;padding:60px 24px;">'
      + '<div style="font-size:3rem;margin-bottom:12px;">🔍</div>'
      + '<div style="font-size:.92rem;font-weight:700;color:var(--t2);margin-bottom:6px;">Nenhuma cuba encontrada</div>'
      + '<div style="font-size:.75rem;color:var(--t3);margin-bottom:18px;">Tente outro termo ou selecione outra categoria</div>'
      + '<button onclick="_catRicoSearch=\'\';_catRicoFiltro=\'todos\';buildCubaListRico();" '
      + 'style="padding:10px 20px;border-radius:10px;border:1px solid var(--bd2);background:var(--s3);'
      + 'color:var(--t2);font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">Limpar filtros</button>'
      + '</div>';
  } else {
    // Separadores por categoria quando "todos" selecionado
    if (_catRicoFiltro === 'todos') {
      var cozItems = lista.filter(function(it){ return it.tipo==='coz'; });
      var lavItems = lista.filter(function(it){ return it.tipo==='lav'; });

      if (cozItems.length) {
        h += _renderSecao('🍳 CUBAS INOX — COZINHA', cozItems, lista);
      }
      if (lavItems.length) {
        h += _renderSecao('🚿 CUBAS — BANHEIRO E LAVABO', lavItems, lista);
      }
    } else {
      var label = _catRicoFiltro==='coz' ? '🍳 CUBAS INOX — COZINHA' : '🚿 CUBAS — BANHEIRO E LAVABO';
      h += _renderSecao(label, lista, lista);
    }
  }

  // ── BOTÕES FIXOS BOTTOM ──────────────────────────────────
  h += '<div style="position:sticky;bottom:0;padding-top:14px;padding-bottom:6px;'
    + 'background:linear-gradient(to top,var(--s1) 65%,transparent);">';
  h += '<div style="display:flex;gap:8px;">';
  h += '<button onclick="gerarCatalogoRicoPDF();" '
    + 'style="flex:1;padding:13px 8px;border-radius:12px;border:1px solid var(--gold3);'
    + 'background:linear-gradient(135deg,#1a0a00,#2a1200);'
    + 'color:var(--gold2);font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;">'
    + '📄 Catálogo PDF</button>';
  h += '<button onclick="compartilharCatalogoRico();" '
    + 'style="flex:1;padding:13px 8px;border-radius:12px;border:1px solid #1a4a2a;'
    + 'background:#0a1f0f;color:#4ade80;font-family:Outfit,sans-serif;font-size:.8rem;'
    + 'font-weight:600;cursor:pointer;">📤 Compartilhar</button>';
  h += '</div></div>';

  wrap.innerHTML = h;

  // Foco automático na busca se tinha texto
  if (_catRicoSearch) {
    var inp = document.getElementById('catRicoSearch');
    if (inp) { inp.focus(); var l=inp.value.length; inp.setSelectionRange(l,l); }
  }
}

// ── Render de seção com título ─────────────────────────────────
function _renderSecao(titulo, itens, listaCompleta) {
  var h = '<div style="margin-bottom:6px;">';
  h += '<div style="font-size:.58rem;letter-spacing:2.5px;color:var(--gold3);font-weight:700;'
    + 'text-transform:uppercase;padding:14px 0 8px;border-bottom:1px solid var(--bd2);'
    + 'margin-bottom:10px;">' + titulo + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding-bottom:4px;">';
  itens.forEach(function(it){
    var idxGlobal = listaCompleta.indexOf(it);
    h += _renderCardCuba(it.cuba, it.tipo, idxGlobal);
  });
  h += '</div></div>';
  return h;
}

// ── Card individual ────────────────────────────────────────────
function _renderCardCuba(cuba, tipo, idx) {
  var meta     = _cubaMeta(cuba);
  var img      = _cubaImg(cuba);
  var preco    = _cubaPrecoFmt(cuba);
  var destaque = !!meta.destaque;

  // Badge: usa meta ou gera automático por tipo de material
  var badge = meta.badge || (meta.tipo_mat ? meta.tipo_mat : (tipo==='coz'?'🍳 Cozinha':'🚿 Banhe.'));

  var h = '<div onclick="_abrirCubaDetalhe(\'' + _escHtml(cuba.id) + '\',\'' + tipo + '\',' + idx + ');" '
    + 'style="background:var(--s3);border-radius:14px;overflow:hidden;cursor:pointer;'
    + 'position:relative;-webkit-tap-highlight-color:transparent;'
    + 'border:1.5px solid ' + (destaque ? 'var(--gold3)' : 'var(--bd2)') + ';'
    + 'transition:opacity .12s;" '
    + 'onpointerdown="this.style.opacity=\'.75\';" '
    + 'onpointerup="this.style.opacity=\'1\';" '
    + 'onpointerleave="this.style.opacity=\'1\';">';

  // Badge pill (canto superior esquerdo)
  if (badge) {
    h += '<div style="position:absolute;top:7px;left:7px;z-index:2;'
      + 'background:rgba(0,0,0,.68);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);'
      + 'border-radius:20px;padding:3px 8px;font-size:.58rem;font-weight:700;letter-spacing:.4px;'
      + 'color:' + (destaque ? 'var(--gold2)' : '#fff') + ';white-space:nowrap;">'
      + badge + '</div>';
  }

  // Tipo de material (Inox / Louça / Porcelana) — canto superior direito
  if (meta.tipo_mat && meta.badge) {
    h += '<div style="position:absolute;top:7px;right:7px;z-index:2;'
      + 'background:rgba(0,0,0,.55);border-radius:20px;padding:2px 7px;'
      + 'font-size:.55rem;color:rgba(255,255,255,.7);">'
      + meta.tipo_mat + '</div>';
  }

  // Foto (aspect-ratio 1:1)
  h += '<div style="width:100%;aspect-ratio:1;background:var(--s2);overflow:hidden;position:relative;">';
  if (img) {
    h += '<img src="' + img + '" alt="' + _escHtml(cuba.nm) + '" loading="lazy" '
      + 'style="width:100%;height:100%;object-fit:contain;padding:8px;box-sizing:border-box;">';
  } else {
    h += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'height:100%;gap:6px;opacity:.35;">'
      + '<div style="font-size:2.4rem;">🚰</div>'
      + '<div style="font-size:.6rem;color:var(--t3);">Sem foto</div>'
      + '</div>';
  }
  h += '</div>';

  // Corpo do card
  h += '<div style="padding:10px 11px 12px;">';

  // Marca
  if (meta.marca_logo || cuba.brand) {
    h += '<div style="font-size:.52rem;letter-spacing:2px;text-transform:uppercase;'
      + 'color:var(--gold3);font-weight:700;margin-bottom:3px;">'
      + _escHtml(meta.marca_logo || cuba.brand) + '</div>';
  }

  // Nome (2 linhas máx)
  h += '<div style="font-size:.82rem;font-weight:700;color:var(--tx);line-height:1.25;'
    + 'margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'
    + _escHtml(cuba.nm) + '</div>';

  // Dimensões
  if (cuba.dim) {
    h += '<div style="font-size:.63rem;color:var(--t3);margin-bottom:7px;">'
      + _escHtml(cuba.dim) + '</div>';
  }

  // 2 features rápidas
  if (meta.features && meta.features.length) {
    h += '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:9px;">';
    meta.features.slice(0,2).forEach(function(f){
      h += '<div style="font-size:.6rem;color:var(--t2);line-height:1.35;">'
        + '<span style="color:var(--gold3);margin-right:3px;">✓</span>' + _escHtml(f) + '</div>';
    });
    if (meta.features.length > 2) {
      h += '<div style="font-size:.58rem;color:var(--t3);">+' + (meta.features.length-2) + ' ver detalhes →</div>';
    }
    h += '</div>';
  }

  // Preço
  h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:9px;'
    + 'padding:8px 11px;display:flex;justify-content:space-between;align-items:baseline;">';
  h += '<span style="font-size:.56rem;color:var(--gold3);text-transform:uppercase;letter-spacing:.8px;">c/ instalação</span>';
  h += '<span style="font-family:\'Cormorant Garamond\',serif;font-size:1.2rem;font-weight:700;'
    + 'color:var(--gold2);">' + preco + '</span>';
  h += '</div>';

  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════
// TELA DE DETALHE
// ══════════════════════════════════════════════════════════════
function _abrirCubaDetalhe(id, tipo, idx) {
  var lista = tipo === 'coz' ? (CFG.coz||[]) : (CFG.lav||[]);
  var cuba  = lista.find(function(c){ return c.id === id; });
  if (!cuba) return;
  // Garante que a lista cache está atualizada
  if (!_catRicoLista.length) _cubaListaFiltrada();
  _catRicoDetalhe = {cuba: cuba, tipo: tipo, idx: (idx !== undefined ? idx : -1)};
  buildCubaListRico();
  var wrap = document.getElementById('cubaListWrap');
  if (wrap) wrap.scrollTop = 0;
}

function _fecharDetalhe() {
  _catRicoDetalhe = null;
  buildCubaListRico();
}

function _navegarDetalhe(delta) {
  var lista = _catRicoLista;
  var cur   = _catRicoDetalhe ? _catRicoDetalhe.idx : -1;
  var prox  = cur + delta;
  if (prox < 0 || prox >= lista.length) return;
  var it = lista[prox];
  _catRicoDetalhe = {cuba: it.cuba, tipo: it.tipo, idx: prox};
  buildCubaListRico();
  var wrap = document.getElementById('cubaListWrap');
  if (wrap) wrap.scrollTop = 0;
}

function _renderDetalhe(cuba, tipo, idx) {
  var meta     = _cubaMeta(cuba);
  var img      = _cubaImg(cuba);
  var preco    = _cubaPrecoFmt(cuba);
  var instStr  = cuba.inst > 0 ? 'R$\u00a0' + cuba.inst.toLocaleString('pt-BR') : null;
  var catLabel = tipo === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
  var lista    = _catRicoLista;
  var temAnterior = idx > 0;
  var temProximo  = idx >= 0 && idx < lista.length - 1;

  var h = '';

  // ── Barra de navegação ──────────────────────────────────
  h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0 12px;">';

  // Botão voltar
  h += '<button onclick="_fecharDetalhe();" '
    + 'style="display:flex;align-items:center;gap:5px;background:transparent;'
    + 'border:1px solid var(--bd2);border-radius:9px;padding:7px 12px;'
    + 'color:var(--t2);font-family:Outfit,sans-serif;font-size:.76rem;cursor:pointer;'
    + 'flex-shrink:0;">← Voltar</button>';

  // Breadcrumb
  h += '<span style="flex:1;font-size:.68rem;color:var(--t3);overflow:hidden;text-overflow:ellipsis;'
    + 'white-space:nowrap;">' + catLabel + ' · ' + _escHtml(cuba.nm) + '</span>';

  // Setas ← →
  h += '<div style="display:flex;gap:4px;">';
  h += '<button onclick="_navegarDetalhe(-1);" '
    + 'style="width:32px;height:32px;border-radius:8px;border:1px solid var(--bd2);'
    + 'background:var(--s3);color:var(--t2);font-size:.85rem;cursor:pointer;'
    + (temAnterior ? '' : 'opacity:.25;pointer-events:none;') + '">‹</button>';
  h += '<button onclick="_navegarDetalhe(1);" '
    + 'style="width:32px;height:32px;border-radius:8px;border:1px solid var(--bd2);'
    + 'background:var(--s3);color:var(--t2);font-size:.85rem;cursor:pointer;'
    + (temProximo ? '' : 'opacity:.25;pointer-events:none;') + '">›</button>';
  h += '</div>';
  h += '</div>'; // fim barra nav

  // ── Foto — proporção 4:3 (menos espaço que 1:1) ─────────
  h += '<div style="background:var(--s2);border-radius:16px;overflow:hidden;margin-bottom:16px;'
    + 'aspect-ratio:4/3;position:relative;">';
  if (img) {
    h += '<img src="' + img + '" alt="' + _escHtml(cuba.nm) + '" '
      + 'style="width:100%;height:100%;object-fit:contain;padding:20px;box-sizing:border-box;" loading="lazy">';
  } else {
    h += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'height:100%;gap:8px;opacity:.3;">'
      + '<div style="font-size:4rem;">🚰</div>'
      + '<div style="font-size:.7rem;color:var(--t3);">Foto não disponível</div>'
      + '</div>';
  }
  // Badge no topo da foto
  if (meta.badge) {
    h += '<div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,.72);'
      + 'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);'
      + 'border-radius:20px;padding:4px 10px;font-size:.62rem;'
      + 'color:' + (meta.destaque?'var(--gold2)':'#fff') + ';font-weight:700;">'
      + meta.badge + '</div>';
  }
  // Tipo de material no topo direito
  if (meta.tipo_mat) {
    h += '<div style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.55);'
      + 'border-radius:20px;padding:3px 9px;font-size:.6rem;color:rgba(255,255,255,.75);'
      + 'font-weight:600;">' + meta.tipo_mat + '</div>';
  }
  h += '</div>';

  // ── Cabeçalho do produto ─────────────────────────────────
  if (meta.marca_logo || cuba.brand) {
    h += '<div style="font-size:.58rem;letter-spacing:2.5px;text-transform:uppercase;'
      + 'color:var(--gold3);font-weight:700;margin-bottom:4px;">'
      + _escHtml(meta.marca_logo || cuba.brand) + '</div>';
  }
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:1.45rem;font-weight:700;'
    + 'color:var(--tx);line-height:1.2;margin-bottom:6px;">' + _escHtml(cuba.nm) + '</div>';
  if (cuba.dim) {
    h += '<div style="font-size:.72rem;color:var(--t3);margin-bottom:14px;">'
      + '📏 ' + _escHtml(cuba.dim) + '</div>';
  }

  // ── Descrição ────────────────────────────────────────────
  if (meta.desc) {
    h += '<div style="font-size:.78rem;color:var(--t2);line-height:1.65;margin-bottom:14px;'
      + 'padding:12px 14px;background:var(--s3);border-radius:12px;'
      + 'border-left:3px solid var(--gold3);">'
      + _escHtml(meta.desc) + '</div>';
  }

  // ── Características ──────────────────────────────────────
  if (meta.features && meta.features.length) {
    h += '<div style="margin-bottom:14px;">';
    h += '<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;'
      + 'color:var(--gold);font-weight:700;margin-bottom:10px;">✔ Características</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    meta.features.forEach(function(f){
      h += '<div style="display:flex;align-items:flex-start;gap:7px;font-size:.72rem;color:var(--t2);'
        + 'background:var(--s3);border-radius:9px;padding:8px 9px;line-height:1.35;">'
        + '<span style="color:var(--gold3);flex-shrink:0;margin-top:1px;font-size:.8rem;">✓</span>'
        + _escHtml(f) + '</div>';
    });
    h += '</div></div>';
  }

  // ── Garantia ─────────────────────────────────────────────
  if (meta.garantia) {
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;'
      + 'padding:10px 14px;background:var(--s3);border-radius:11px;">';
    h += '<span style="font-size:1.3rem;">🛡️</span>';
    h += '<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:2px;">Garantia do fabricante</div>'
      + '<div style="font-size:.82rem;font-weight:700;color:var(--tx);">' + _escHtml(meta.garantia) + '</div>'
      + '</div>';
    h += '</div>';
  }

  // ── Preço ────────────────────────────────────────────────
  h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:14px;'
    + 'padding:16px;margin-bottom:14px;">';
  h += '<div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;'
    + 'letter-spacing:1.5px;margin-bottom:6px;">Preço com instalação profissional</div>';
  h += '<div style="font-family:\'Cormorant Garamond\',serif;font-size:2rem;font-weight:700;'
    + 'color:var(--gold2);line-height:1;margin-bottom:' + (instStr?'6px':'0') + ';">' + preco + '</div>';
  if (instStr) {
    h += '<div style="font-size:.65rem;color:var(--t3);">↳ Mão de obra inclusa: ' + instStr + '</div>';
  }
  h += '</div>';

  // ── Botões de ação ───────────────────────────────────────
  h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  h += '<button onclick="_selecionarCubaDetalhe(\'' + _escHtml(cuba.id) + '\',\'' + tipo + '\');" '
    + 'style="flex:2;padding:14px;border-radius:12px;border:none;cursor:pointer;'
    + 'background:linear-gradient(135deg,#a07828,var(--gold2));'
    + 'color:#0f0c00;font-family:Outfit,sans-serif;font-size:.85rem;font-weight:700;">'
    + '✓ Adicionar ao orçamento</button>';
  h += '<button onclick="_compartilharCubaDetalhe(\'' + _escHtml(cuba.id) + '\',\'' + tipo + '\');" '
    + 'style="flex:1;padding:14px;border-radius:12px;border:1px solid #1a4a2a;'
    + 'background:#0a1f0f;color:#4ade80;font-family:Outfit,sans-serif;'
    + 'font-size:.8rem;cursor:pointer;">📤 WhatsApp</button>';
  h += '</div>';

  // Nota rodapé
  h += '<div style="font-size:.63rem;color:var(--t3);text-align:center;padding:0 10px 24px;line-height:1.5;">'
    + 'Preço inclui fornecimento + instalação profissional<br>'
    + 'pela HR Mármores e Granitos</div>';

  // Contador de posição (ex: 3 / 11)
  if (idx >= 0 && lista.length > 1) {
    h += '<div style="text-align:center;font-size:.65rem;color:var(--t3);padding-bottom:8px;">'
      + (idx+1) + ' de ' + lista.length + '</div>';
  }

  return h;
}

// ══════════════════════════════════════════════════════════════
// AÇÕES
// ══════════════════════════════════════════════════════════════
function _selecionarCubaDetalhe(id, tipo) {
  if (typeof pickCuba === 'function') {
    pickCuba(id, tipo);
    _fecharDetalhe();
    return;
  }
  _fecharDetalhe();
  if (typeof toast === 'function') toast('Cuba selecionada! Adicione ao orçamento normalmente.');
}

function _compartilharCubaDetalhe(id, tipo) {
  var lista = tipo === 'coz' ? (CFG.coz||[]) : (CFG.lav||[]);
  var cuba  = lista.find(function(c){ return c.id === id; });
  if (!cuba) return;
  var meta  = _cubaMeta(cuba);
  var emp   = CFG.emp || {};
  var preco = _cubaPrecoFmt(cuba);

  var txt = '*' + (emp.nome||'HR Mármores') + '*\n' + (emp.tel||'') + '\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n'
    + '🚰 *' + (cuba.nm||'').toUpperCase() + '*\n'
    + '━━━━━━━━━━━━━━━━━━━━\n\n';
  if (meta.marca_logo||cuba.brand) txt += '🏷️ Marca: ' + (meta.marca_logo||cuba.brand) + '\n';
  if (meta.tipo_mat) txt += '🔩 Material: ' + meta.tipo_mat + '\n';
  if (cuba.dim)  txt += '📏 Medidas: ' + cuba.dim + '\n';
  txt += '💰 Preço c/ instalação: *' + preco + '*\n';
  if (meta.garantia) txt += '🛡️ Garantia: ' + meta.garantia + '\n';
  if (meta.desc) txt += '\n' + meta.desc + '\n';
  if (meta.features && meta.features.length) {
    txt += '\n✅ *Características:*\n';
    meta.features.forEach(function(f){ txt += '• ' + f + '\n'; });
  }
  txt += '\n━━━━━━━━━━━━━━━━━━━━\n'
    + '📍 ' + (emp.end||'') + '\n'
    + '📞 ' + (emp.tel||'');

  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}

function compartilharCatalogoRico() {
  var lista = _cubaListaFiltrada();
  var emp   = CFG.emp || {};
  var label = _catRicoFiltro==='coz' ? '🍳 CUBAS PARA COZINHA'
            : _catRicoFiltro==='lav' ? '🚿 CUBAS PARA BANHEIRO/LAVABO'
            : '🚰 CATÁLOGO COMPLETO DE CUBAS';

  var txt = '*' + (emp.nome||'HR Mármores') + '*\n' + (emp.tel||'') + '\n\n'
    + '━━━━━━━━━━━━━━━━━━━━\n' + label + '\n' + '━━━━━━━━━━━━━━━━━━━━\n\n';

  lista.forEach(function(it){
    var preco = _cubaPrecoFmt(it.cuba);
    txt += '◆ *' + (it.cuba.nm||'') + '*\n';
    if (it.cuba.brand) txt += '  ' + it.cuba.brand;
    if (it.cuba.dim)   txt += (it.cuba.brand?' · ':'  ') + it.cuba.dim;
    txt += '\n  💰 ' + preco + '\n\n';
  });

  txt += '━━━━━━━━━━━━━━━━━━━━\n'
    + '📍 ' + (emp.end||'') + '\n'
    + '📞 ' + (emp.tel||'');

  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}

// ══════════════════════════════════════════════════════════════
// PDF RICO
// ══════════════════════════════════════════════════════════════
function gerarCatalogoRicoPDF() {
  var lista  = _cubaListaFiltrada();
  var emp    = CFG.emp || {};
  var titulo = _catRicoFiltro==='coz' ? 'Cubas para Cozinha'
             : _catRicoFiltro==='lav' ? 'Cubas para Banheiro e Lavabo'
             : 'Catálogo de Cubas';

  function cubaCard(it) {
    var img  = _cubaImg(it.cuba);
    var meta = _cubaMeta(it.cuba);
    var preco = _cubaPrecoFmt(it.cuba);
    var featHtml = '';
    if (meta.features && meta.features.length) {
      featHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:6px;">'
        + meta.features.map(function(f){
            return '<div style="font-size:8px;color:#555;line-height:1.4;display:flex;align-items:flex-start;gap:4px;">'
              + '<span style="color:#b08040;flex-shrink:0;">✓</span>' + f + '</div>';
          }).join('')
        + '</div>';
    }
    var badgeHtml = meta.badge
      ? '<div style="display:inline-block;background:#faf5ea;border:1px solid #e8d89c;border-radius:20px;'
        + 'padding:2px 8px;font-size:7px;color:#8b6014;font-weight:700;margin-bottom:5px;">' + meta.badge + '</div><br>'
      : '';
    var tipoHtml = meta.tipo_mat
      ? '<span style="font-size:7px;color:#999;background:#f0f0f0;border-radius:10px;'
        + 'padding:1px 6px;margin-left:4px;">' + meta.tipo_mat + '</span>'
      : '';

    return '<div style="break-inside:avoid;background:#fff;border:1px solid #e0d8cc;'
      + 'border-radius:10px;overflow:hidden;margin-bottom:14px;">'
      + (img
          ? '<img src="' + img + '" style="width:100%;height:140px;object-fit:contain;'
            + 'background:#f9f9f9;display:block;padding:8px;box-sizing:border-box;">'
          : '<div style="width:100%;height:80px;background:#f5f5f5;display:flex;'
            + 'align-items:center;justify-content:center;font-size:2rem;color:#ccc;">🚰</div>')
      + '<div style="padding:10px 12px;">'
        + badgeHtml
        + (meta.marca_logo||it.cuba.brand
            ? '<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;'
              + 'color:#b08040;font-weight:700;margin-bottom:2px;">'
              + (meta.marca_logo||it.cuba.brand) + tipoHtml + '</div>'
            : '')
        + '<div style="font-size:12px;font-weight:900;color:#1a1a1a;margin-bottom:2px;line-height:1.2;">'
          + (it.cuba.nm||'') + '</div>'
        + (it.cuba.dim ? '<div style="font-size:9px;color:#888;margin-bottom:6px;">' + it.cuba.dim + '</div>' : '')
        + (meta.desc ? '<div style="font-size:8px;color:#666;line-height:1.5;margin-bottom:6px;'
          + 'border-left:2px solid #e8d89c;padding-left:6px;">' + meta.desc + '</div>' : '')
        + featHtml
        + (meta.garantia
            ? '<div style="font-size:8px;color:#888;margin-bottom:6px;">🛡️ Garantia: ' + meta.garantia + '</div>'
            : '')
        + '<div style="background:#faf5ea;border:1px solid #e8d89c;border-radius:7px;'
          + 'padding:7px 10px;display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:8px;color:#8b6014;font-weight:700;text-transform:uppercase;">c/ instalação</span>'
          + '<span style="font-size:17px;font-weight:900;color:#8b6014;">' + preco + '</span>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  var cardsHtml = lista.map(cubaCard).join('');

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<title>Catálogo de Cubas — ' + (emp.nome||'HR Mármores') + '</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    + 'body{font-family:Arial,Helvetica,sans-serif;background:#fff;}'
    + '.page{max-width:800px;margin:0 auto;}'
    + '.hdr{background:#0f0c00;padding:26px 36px;display:flex;justify-content:space-between;align-items:center;}'
    + '.brand{font-size:22px;font-weight:900;color:#C9A84C;}'
    + '.tag{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.4);margin-top:4px;}'
    + '.hdr-r{text-align:right;}'
    + '.hdr-tel{font-size:13px;font-weight:700;color:#C9A84C;}'
    + '.hdr-city{font-size:9px;color:rgba(255,255,255,.3);margin-top:3px;}'
    + '.tbar{background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:12px 36px;}'
    + '.tbar-t{font-size:16px;font-weight:900;color:#5a3a06;}'
    + '.tbar-s{font-size:9px;color:#999;margin-top:3px;}'
    + '.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px 36px;}'
    + '.foot{background:#0f0c00;padding:14px 36px;display:flex;justify-content:space-between;}'
    + '.foot-l{font-size:9px;color:rgba(201,168,76,.5);}'
    + '.foot-r{font-size:9px;color:rgba(255,255,255,.2);text-align:right;}'
    + '@media print{.page{max-width:100%;}}'
    + '</style></head><body><div class="page">'
    + '<div class="hdr">'
      + '<div><div class="brand">' + _escHtml(emp.nome||'HR Mármores e Granitos') + '</div>'
      + '<div class="tag">Mármores · Granitos · Cubas e Acessórios</div></div>'
      + '<div class="hdr-r"><div class="hdr-tel">' + _escHtml(emp.tel||'') + '</div>'
      + '<div class="hdr-city">' + _escHtml(emp.cidade||'') + '</div></div>'
    + '</div>'
    + '<div class="tbar"><div class="tbar-t">🚰 ' + titulo + '</div>'
    + '<div class="tbar-s">Preços com instalação profissional · ' + lista.length + ' modelo' + (lista.length!==1?'s':'') + ' disponíve' + (lista.length!==1?'is':'l') + '</div></div>'
    + '<div class="grid">' + cardsHtml + '</div>'
    + '<div class="foot">'
      + '<div class="foot-l">CNPJ: ' + _escHtml(emp.cnpj||'') + ' · ' + _escHtml(emp.ig||'') + '</div>'
      + '<div class="foot-r">' + _escHtml(emp.end||'') + '</div>'
    + '</div>'
    + '</div><script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>'
    + '</body></html>';

  var blob = new Blob([html], {type:'text/html;charset=utf-8'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'Catalogo_Cubas_HR.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 8000);
  if (typeof toast === 'function') toast('📥 Catálogo baixado! Abra e imprima como PDF.');
}

// ─── Alias retrocompatibilidade ───────────────────────────────
// window.buildCubaList = buildCubaListRico;
