// ══════════════════════════════════════════════════════════════
// CATÁLOGO DE CUBAS v4 — ESTILO MERCADO LIVRE
// HR Mármores e Granitos
// ══════════════════════════════════════════════════════════════

var _catFiltro  = 'todos';
var _catOrdem   = 'padrao';
var _catSearch  = '';
var _catDetalhe = null;
var _catLista   = [];
var _detFotoIdx = 0;

// ─── Metadados ────────────────────────────────────────────────
var CUBA_META = {
  tramontina_prime: {
    destaque: true, mais_vendido: true,
    badge: 'MAIS VENDIDO',
    desc: 'Cuba inox de alta qualidade com acabamento acetinado. Fundo rebaixado anti-ruído, kit completo incluso. Ideal para cozinhas modernas e de alto padrão.',
    features: ['Aço inox 304 — 0,6mm','Acabamento acetinado premium','Fundo rebaixado anti-ruído','Kit válvula + sifão inclusos','Torneira inclusa no kit'],
    specs: {Material:'Aço Inox 304',Espessura:'0,6 mm',Acabamento:'Acetinado',Profundidade:'20 cm',Instalação:'Embutir'},
    garantia: '5 anos', tipo_mat: 'Inox', marca_logo: 'TRAMONTINA',
    vendidos: '+500 vendidos', nota: 4.9,
  },
  meganox_gourmet: {
    badge: 'GOURMET',
    desc: 'Cuba com tábua de corte integrada em bambu tratado. Dupla função: lavar e preparar alimentos no mesmo espaço.',
    features: ['Aço inox escovado premium','Tábua de bambu certificado','Grade escorredor inox','Torneira inclusa','60×42 cm'],
    specs: {Material:'Aço Inox',Acabamento:'Escovado',Dimensões:'60×42 cm',Profundidade:'22 cm',Instalação:'Embutir'},
    garantia: '3 anos', tipo_mat: 'Inox', marca_logo: 'MEGANOX',
    vendidos: '+200 vendidos', nota: 4.8,
  },
  premium_304_6040: {
    destaque: true, badge: 'PREMIUM',
    desc: 'Cuba quadrada de embutir em aço inox 304 grau alimentício. Cantos arredondados facilitam a limpeza. Acabamento espelhado de alto brilho.',
    features: ['Aço 304 grau alimentício','60×40 cm','Profundidade 17 cm','Acabamento espelhado','Silicone vedante incluso'],
    specs: {Material:'Aço Inox 304',Grau:'Alimentício',Acabamento:'Espelhado',Dimensões:'60×40 cm',Profundidade:'17 cm'},
    garantia: '5 anos', tipo_mat: 'Inox', marca_logo: 'PREMIUM 304',
    vendidos: '+300 vendidos', nota: 4.9,
  },
  brinovar_5040: {
    desc: 'Cuba de sobrepor com bordas altas. Perfeita para área de serviço, lavanderia e churrasqueira.',
    features: ['50×40×20 cm','Bordas altas anti-respingo','Fundo com canaleta','Uso interno e externo','Fácil instalação'],
    specs: {Material:'Aço Inox',Dimensões:'50×40 cm',Profundidade:'20 cm',Instalação:'Sobrepor'},
    garantia: '2 anos', tipo_mat: 'Inox', marca_logo: 'BRINOVAR',
    vendidos: '+100 vendidos', nota: 4.5,
  },
  meranox_padrao: {
    desc: 'Cuba inox padrão de excelente custo-benefício. Acabamento liso de fácil limpeza.',
    features: ['Aço inox 430','Acabamento polido liso','Kit sifão incluso','Medidas universais'],
    specs: {Material:'Aço Inox 430',Acabamento:'Polido liso',Kit:'Sifão incluso'},
    garantia: '2 anos', tipo_mat: 'Inox', marca_logo: 'MERANOX',
    vendidos: '+150 vendidos', nota: 4.3,
  },
  escorredor_inox: {
    desc: 'Módulo escorredor em inox para embutir ao lado da cuba principal.',
    features: ['Inox 430 resistente','Superfície nervurada','Drenagem lateral integrada','Universal'],
    specs: {Material:'Inox 430',Superfície:'Nervurada',Drenagem:'Lateral'},
    garantia: '2 anos', tipo_mat: 'Inox', marca_logo: 'HR',
    vendidos: '+80 vendidos', nota: 4.4,
  },
  icasa_red: {
    desc: 'Cuba redonda de louça esmaltada com bordas retas. Visual sofisticado para lavabos e banheiros.',
    features: ['Louça sanitária vitrificada','Diâmetro 37 cm','Altura 14 cm','Para embutir em tampo','Acabamento brilhante'],
    specs: {Material:'Louça vitrificada',Formato:'Redonda',Diâmetro:'37 cm',Altura:'14 cm'},
    garantia: '3 anos', tipo_mat: 'Louça', marca_logo: 'ICASA',
    vendidos: '+120 vendidos', nota: 4.7,
  },
  beltempo_oval: {
    desc: 'Cuba oval de sobrepor para lavabo. Kit completo incluso.',
    features: ['Louça branca premium','60×43 cm','Inclui torneira e sifão','Certificação INMETRO'],
    specs: {Material:'Louça',Formato:'Oval',Dimensões:'60×43 cm',Kit:'Torneira + sifão'},
    garantia: '3 anos', tipo_mat: 'Louça', marca_logo: 'BELTEMPO',
    vendidos: '+90 vendidos', nota: 4.6,
  },
  lorenz_oval_emb: {
    destaque: true, badge: 'LUXO',
    desc: 'Cuba oval de embutir premium com acabamento texturizado. Design exclusivo europeu.',
    features: ['Porcelana premium importada','Oval 56×38 cm','Bordas ultra-finas','Branco e off-white','ISO 9001'],
    specs: {Material:'Porcelana importada',Formato:'Oval',Dimensões:'56×38 cm',Bordas:'Ultra-finas'},
    garantia: '5 anos', tipo_mat: 'Porcelana', marca_logo: 'LORENZ',
    vendidos: '+60 vendidos', nota: 5.0,
  },
  docol_red_emb: {
    desc: 'Cuba redonda de embutir com acabamento vitrificado. Clássica e atemporal.',
    features: ['Louça vitrificada','Diâmetro 42 cm','Para embutir','Branco clássico'],
    specs: {Material:'Louça vitrificada',Formato:'Redonda',Diâmetro:'42 cm'},
    garantia: '3 anos', tipo_mat: 'Louça', marca_logo: 'DOCOL',
    vendidos: '+200 vendidos', nota: 4.5,
  },
  deca_quad_emb: {
    desc: 'Cuba quadrada de embutir em louça de alta qualidade. Design geométrico moderno.',
    features: ['Louça sanitária branca','44×44 cm','Para embutir','Superfície antibacteriana'],
    specs: {Material:'Louça sanitária',Formato:'Quadrada',Dimensões:'44×44 cm'},
    garantia: '3 anos', tipo_mat: 'Louça', marca_logo: 'DECA',
    vendidos: '+170 vendidos', nota: 4.7,
  },
};

var CUBA_FOTO_MAP = {
  tramontina_prime:'tramontina_prime', meganox_gourmet:'meganox_gourmet',
  premium_304_6040:'premium_304_6040', brinovar_5040:'brinovar_5040',
  meranox_padrao:'meranox_padrao',     escorredor_inox:'escorredor_inox',
  icasa_red:'icasa_red',               beltempo_oval:'beltempo_oval',
  lorenz_oval_emb:'lorenz_oval_emb',   docol_red_emb:'docol_red_emb',
  deca_quad_emb:'deca_quad_emb',
};

// ─── Helpers ──────────────────────────────────────────────────
function _cubaImg(item) {
  if (item.photo && item.photo.startsWith('data:')) return item.photo;
  if (typeof CUBA_IMGS !== 'undefined') {
    var key = CUBA_FOTO_MAP[item.id] || item.id;
    if (CUBA_IMGS[key]) return CUBA_IMGS[key];
  }
  return null;
}
function _cubaMeta(item) { return CUBA_META[item.id] || {}; }
function _escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _precoFmt(item) {
  return (item.pr||0) > 0 ? 'R$\u00a0' + item.pr.toLocaleString('pt-BR') : 'Sob consulta';
}
function _stars(nota) {
  var n = Math.round(nota||5);
  var h = '';
  for (var i=1;i<=5;i++) h += '<span style="color:'+(i<=n?'#f59e0b':'#ccc')+';font-size:.72rem;">★</span>';
  return h;
}
function _getFotos(item) {
  var p = _cubaImg(item);
  var extras = item.fotos || [];
  var all = [];
  if (p) all.push(p);
  extras.forEach(function(f){ if(f && !all.includes(f)) all.push(f); });
  return all;
}

// ─── Lista filtrada ───────────────────────────────────────────
function _listaFiltrada() {
  var coz = (CFG.coz||[]).map(function(c){ return {item:c, tipo:'coz'}; });
  var lav = (CFG.lav||[]).filter(function(c){ return c.tipo!=='Esculpida'; }).map(function(c){ return {item:c, tipo:'lav'}; });
  var ac  = (CFG.ac||[]).map(function(a){ return {item:a, tipo:'ac'}; });
  var lista = _catFiltro==='coz'?coz : _catFiltro==='lav'?lav : _catFiltro==='ac'?ac : coz.concat(lav).concat(ac);
  if (_catSearch.trim()) {
    var q = _catSearch.toLowerCase();
    lista = lista.filter(function(it){
      return (it.item.nm||'').toLowerCase().includes(q)
          || (it.item.brand||it.item.marca||'').toLowerCase().includes(q)
          || (it.item.dim||'').toLowerCase().includes(q)
          || (_cubaMeta(it.item).tipo_mat||'').toLowerCase().includes(q);
    });
  }
  if (_catOrdem==='preco_asc')  lista.sort(function(a,b){ return (a.item.pr||0)-(b.item.pr||0); });
  if (_catOrdem==='preco_desc') lista.sort(function(a,b){ return (b.item.pr||0)-(a.item.pr||0); });
  if (_catOrdem==='nome')       lista.sort(function(a,b){ return (a.item.nm||'').localeCompare(b.item.nm||''); });
  _catLista = lista;
  return lista;
}

// ══════════════════════════════════════════════════════════════
// RENDER PRINCIPAL — GRID ESTILO ML
// ══════════════════════════════════════════════════════════════
function buildCubaListRico() {
  var wrap = document.getElementById('cubaListWrap');
  if (!wrap) return;

  if (_catDetalhe) {
    wrap.innerHTML = _renderDetalhe(_catDetalhe.item, _catDetalhe.tipo, _catDetalhe.idx);
    _bindSwipe(wrap);
    return;
  }

  var lista = _listaFiltrada();
  var total = lista.length;
  var cozN  = (CFG.coz||[]).length;
  var lavN  = (CFG.lav||[]).filter(function(c){ return c.tipo!=='Esculpida'; }).length;
  var acN   = (CFG.ac||[]).length;

  var h = '';

  // ── HEADER STICKY ─────────────────────────────────────────
  h += '<div style="position:sticky;top:0;z-index:10;background:#fff;padding:10px 0 8px;border-bottom:1px solid #eee;">';

  // Busca — fundo branco estilo ML
  h += '<div style="position:relative;margin-bottom:8px;">'
    + '<span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#999;font-size:.9rem;">🔍</span>'
    + '<input type="text" id="catSearch" placeholder="Buscar produto…" value="'+_escHtml(_catSearch)+'" '
    + 'oninput="_catSearch=this.value;buildCubaListRico();" '
    + 'style="width:100%;box-sizing:border-box;padding:10px 36px 10px 36px;border-radius:8px;'
    + 'border:1.5px solid #ddd;background:#f7f7f7;color:#333;font-family:Outfit,sans-serif;font-size:.85rem;outline:none;">';
  if (_catSearch) {
    h += '<button onclick="_catSearch=\'\';buildCubaListRico();" '
      + 'style="position:absolute;right:10px;top:50%;transform:translateY(-50%);'
      + 'background:none;border:none;color:#999;cursor:pointer;font-size:1rem;">✕</button>';
  }
  h += '</div>';

  // Filtros — pills
  h += '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;">';
  [{k:'todos',lbl:'Tudo',n:cozN+lavN+acN},{k:'coz',lbl:'🍳 Cozinha',n:cozN},{k:'lav',lbl:'🚿 Banheiro',n:lavN},{k:'ac',lbl:'🔩 Acessórios',n:acN}]
    .forEach(function(f){
      var on = _catFiltro===f.k;
      h += '<button onclick="_catFiltro=\''+f.k+'\';buildCubaListRico();" '
        + 'style="flex-shrink:0;padding:5px 13px;border-radius:20px;cursor:pointer;'
        + 'font-family:Outfit,sans-serif;font-size:.73rem;white-space:nowrap;'
        + 'border:1.5px solid '+(on?'#3483fa':'#ddd')+';'
        + 'background:'+(on?'#3483fa':'#fff')+';'
        + 'color:'+(on?'#fff':'#555')+';font-weight:'+(on?'700':'400')+';">'
        + f.lbl + ' <span style="opacity:.5;font-size:.65rem;">('+f.n+')</span></button>';
    });
  h += '</div>';
  h += '</div>'; // fim sticky

  // Sub-header: total + ordenação
  h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 6px;">';
  h += '<span style="font-size:.7rem;color:#999;">' + total + ' resultado' + (total!==1?'s':'') + '</span>';
  h += '<select onchange="_catOrdem=this.value;buildCubaListRico();" '
    + 'style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:4px 8px;'
    + 'color:#555;font-family:Outfit,sans-serif;font-size:.7rem;outline:none;cursor:pointer;">';
  [{k:'padrao',lbl:'Relevância'},{k:'preco_asc',lbl:'Menor preço'},{k:'preco_desc',lbl:'Maior preço'},{k:'nome',lbl:'A–Z'}]
    .forEach(function(o){ h += '<option value="'+o.k+'"'+(_catOrdem===o.k?' selected':'')+'>'+o.lbl+'</option>'; });
  h += '</select></div>';

  // ── GRID 2 COLUNAS ────────────────────────────────────────
  if (total===0) {
    h += '<div style="text-align:center;padding:60px 20px;">'
      + '<div style="font-size:3rem;margin-bottom:12px;">🔍</div>'
      + '<div style="font-size:.9rem;font-weight:700;color:#333;margin-bottom:6px;">Nenhum resultado</div>'
      + '<button onclick="_catSearch=\'\';_catFiltro=\'todos\';buildCubaListRico();" '
      + 'style="margin-top:10px;padding:9px 18px;border-radius:8px;border:1px solid #ddd;background:#f7f7f7;'
      + 'color:#555;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">Limpar filtros</button></div>';
  } else {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid #eee;">';
    lista.forEach(function(it, i){
      h += _renderCard(it.item, it.tipo, i);
    });
    h += '</div>';
  }

  // ── BOTÕES FIXOS ─────────────────────────────────────────
  h += '<div style="position:sticky;bottom:0;background:#fff;border-top:1px solid #eee;padding:10px 0;">';
  h += '<div style="display:flex;gap:8px;">';
  h += '<button onclick="gerarCatalogoRicoPDF();" '
    + 'style="flex:1;padding:12px;border-radius:8px;border:1.5px solid #C9A84C;'
    + 'background:#fff;color:#8b6014;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;">📄 PDF</button>';
  h += '<button onclick="compartilharCatalogoRico();" '
    + 'style="flex:1;padding:12px;border-radius:8px;border:none;'
    + 'background:#25d366;color:#fff;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;">📤 WhatsApp</button>';
  h += '</div></div>';

  wrap.innerHTML = h;
  if (_catSearch) {
    var inp = document.getElementById('catSearch');
    if (inp) { inp.focus(); var l=inp.value.length; inp.setSelectionRange(l,l); }
  }
}

// ── Card estilo ML ────────────────────────────────────────────
function _renderCard(item, tipo, idx) {
  var meta   = _cubaMeta(item);
  var img    = _cubaImg(item);
  var preco  = _precoFmt(item);
  var nota   = meta.nota || 4.5;
  var vend   = meta.vendidos || '';
  var marca  = meta.marca_logo || item.brand || item.marca || '';
  var isBorda = idx % 2 === 0; // borda direita nos pares

  var h = '<div onclick="_abrirDetalhe(\''+_escHtml(item.id)+'\',\''+tipo+'\','+idx+');" '
    + 'style="background:#fff;cursor:pointer;position:relative;'
    + 'border-bottom:1px solid #eee;'
    + (isBorda?'border-right:1px solid #eee;':'')
    + 'padding:0;-webkit-tap-highlight-color:transparent;'
    + 'transition:background .1s;" '
    + 'onpointerdown="this.style.background=\'#f5f5f5\';" '
    + 'onpointerup="this.style.background=\'#fff\';" '
    + 'onpointerleave="this.style.background=\'#fff\';">';

  // Badge (MAIS VENDIDO, PREMIUM etc)
  if (meta.badge) {
    var bgBadge = meta.mais_vendido ? '#ff6900' : meta.destaque ? '#C9A84C' : '#3483fa';
    h += '<div style="position:absolute;top:0;left:0;z-index:2;'
      + 'background:'+bgBadge+';'
      + 'padding:3px 8px;font-size:.55rem;font-weight:700;color:#fff;letter-spacing:.3px;">'
      + meta.badge + '</div>';
  }

  // Foto quadrada — fundo branco como ML
  h += '<div style="width:100%;aspect-ratio:1;background:#f9f9f9;overflow:hidden;position:relative;">';
  if (img) {
    h += '<img src="'+img+'" alt="'+_escHtml(item.nm)+'" loading="lazy" '
      + 'style="width:100%;height:100%;object-fit:contain;padding:12px;box-sizing:border-box;">';
  } else {
    h += '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;opacity:.2;">'
      + (tipo==='ac'?'🔩':'🚰') + '</div>';
  }
  h += '</div>';

  // Info
  h += '<div style="padding:8px 10px 12px;">';

  // Nome — 2 linhas
  h += '<div style="font-size:.78rem;color:#333;line-height:1.3;margin-bottom:4px;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'
    + _escHtml(item.nm) + '</div>';

  // Marca
  if (marca) {
    h += '<div style="font-size:.62rem;color:#3483fa;font-weight:700;margin-bottom:3px;">' + _escHtml(marca) + '</div>';
  }

  // Estrelas + vendidos
  h += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:5px;">'
    + _stars(nota)
    + '<span style="font-size:.6rem;color:#999;">' + nota.toFixed(1) + '</span>';
  if (vend) h += '<span style="font-size:.6rem;color:#999;margin-left:2px;">| '+vend+'</span>';
  h += '</div>';

  // Preço — destaque igual ML
  if ((item.pr||0) > 0) {
    h += '<div style="font-size:1.15rem;font-weight:700;color:#333;line-height:1;">'
      + 'R$\u00a0<span style="font-size:1.3rem;">' + item.pr.toLocaleString('pt-BR') + '</span></div>';
    h += '<div style="font-size:.62rem;color:#00a650;margin-top:2px;font-weight:600;">c/ instalação inclusa</div>';
  } else {
    h += '<div style="font-size:.82rem;color:#999;">Sob consulta</div>';
  }

  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════
// DETALHE — ESTILO MERCADO LIVRE
// ══════════════════════════════════════════════════════════════
function _abrirDetalhe(id, tipo, idx) {
  var lista = tipo==='coz'?(CFG.coz||[]):tipo==='lav'?(CFG.lav||[]):(CFG.ac||[]);
  var item  = lista.find(function(x){ return x.id===id; });
  if (!item) return;
  if (!_catLista.length) _listaFiltrada();
  _catDetalhe = {item:item, tipo:tipo, idx:(idx!==undefined?idx:-1)};
  _detFotoIdx = 0;
  buildCubaListRico();
  var wrap = document.getElementById('cubaListWrap');
  if (wrap) wrap.scrollTop = 0;
}

function _fecharDetalhe() { _catDetalhe=null; buildCubaListRico(); }

function _navegarDetalhe(delta) {
  var lista = _catLista;
  var prox  = (_catDetalhe?_catDetalhe.idx:-1)+delta;
  if (prox<0||prox>=lista.length) return;
  var it = lista[prox];
  _catDetalhe = {item:it.item, tipo:it.tipo, idx:prox};
  _detFotoIdx = 0;
  buildCubaListRico();
  var wrap = document.getElementById('cubaListWrap');
  if (wrap) wrap.scrollTop = 0;
}

function _trocarFoto(idx) {
  _detFotoIdx = idx;
  var fotos = _getFotos(_catDetalhe.item);
  // Atualiza só a imagem principal e thumbs sem re-render completo
  var mainImg = document.getElementById('_detMain');
  if (mainImg) mainImg.src = fotos[idx];
  // Atualiza borda das thumbs
  document.querySelectorAll('._thumb').forEach(function(el,i){
    el.style.borderColor = i===idx ? '#3483fa' : '#eee';
  });
}

function _renderDetalhe(item, tipo, idx) {
  var meta   = _cubaMeta(item);
  var fotos  = _getFotos(item);
  var preco  = _precoFmt(item);
  var nota   = meta.nota || 4.5;
  var vend   = meta.vendidos || '';
  var marca  = meta.marca_logo || item.brand || item.marca || '';
  var lista  = _catLista;
  var temAnt = idx>0;
  var temProx= idx>=0&&idx<lista.length-1;

  var h = '';

  // ── Barra topo ─────────────────────────────────────────────
  h += '<div style="display:flex;align-items:center;justify-content:space-between;'
    + 'padding:10px 0 8px;border-bottom:1px solid #eee;">';
  h += '<button onclick="_fecharDetalhe();" '
    + 'style="display:flex;align-items:center;gap:4px;background:transparent;border:none;'
    + 'color:#3483fa;font-family:Outfit,sans-serif;font-size:.82rem;cursor:pointer;padding:4px 0;">← Voltar</button>';
  h += '<div style="display:flex;gap:6px;">';
  h += '<button onclick="_navegarDetalhe(-1);" style="width:30px;height:30px;border-radius:50%;border:1px solid #ddd;'
    + 'background:#fff;color:#555;font-size:.9rem;cursor:pointer;'+(temAnt?'':'opacity:.2;pointer-events:none;')+'">‹</button>';
  h += '<button onclick="_navegarDetalhe(1);"  style="width:30px;height:30px;border-radius:50%;border:1px solid #ddd;'
    + 'background:#fff;color:#555;font-size:.9rem;cursor:pointer;'+(temProx?'':'opacity:.2;pointer-events:none;')+'">›</button>';
  h += '</div></div>';

  // ── Layout galeria — thumbs esquerda + foto grande ─────────
  h += '<div style="display:flex;gap:8px;margin:12px 0 14px;">';

  // Miniaturas laterais (igual ML)
  if (fotos.length > 1) {
    h += '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">';
    fotos.forEach(function(f,i){
      var ativo = i===_detFotoIdx;
      h += '<div class="_thumb" onclick="_trocarFoto('+i+');" '
        + 'style="width:52px;height:52px;border-radius:6px;border:2px solid '+(ativo?'#3483fa':'#eee')+';'
        + 'background:#f9f9f9;overflow:hidden;cursor:pointer;flex-shrink:0;transition:border-color .15s;">'
        + '<img src="'+f+'" style="width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;"></div>';
    });
    h += '</div>';
  }

  // Foto principal
  h += '<div style="flex:1;background:#f9f9f9;border-radius:10px;overflow:hidden;aspect-ratio:1;position:relative;">';
  if (fotos.length) {
    h += '<img id="_detMain" src="'+fotos[_detFotoIdx]+'" alt="'+_escHtml(item.nm)+'" '
      + 'style="width:100%;height:100%;object-fit:contain;padding:16px;box-sizing:border-box;" loading="lazy">';
    // Contador
    if (fotos.length > 1) {
      h += '<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.45);'
        + 'border-radius:20px;padding:2px 8px;font-size:.6rem;color:#fff;">'+(_detFotoIdx+1)+'/'+fotos.length+'</div>';
    }
  } else {
    h += '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:4rem;opacity:.15;">'
      + (tipo==='ac'?'🔩':'🚰') + '</div>';
  }
  h += '</div></div>'; // fim galeria

  // ── Info produto ───────────────────────────────────────────
  // Badge
  if (meta.badge) {
    var bgB = meta.mais_vendido?'#ff6900':meta.destaque?'#C9A84C':'#3483fa';
    h += '<div style="display:inline-block;background:'+bgB+';color:#fff;font-size:.62rem;'
      + 'font-weight:700;padding:3px 9px;border-radius:4px;margin-bottom:6px;">' + meta.badge + '</div>';
  }

  // Nome
  h += '<div style="font-size:1rem;font-weight:600;color:#333;line-height:1.35;margin-bottom:5px;">'
    + _escHtml(item.nm) + '</div>';

  // Nota + vendidos
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">'
    + _stars(nota)
    + '<span style="font-size:.72rem;color:#3483fa;">' + nota.toFixed(1) + '</span>';
  if (vend) h += '<span style="font-size:.7rem;color:#999;">| '+_escHtml(vend)+'</span>';
  h += '</div>';

  // Marca
  if (marca) {
    h += '<div style="font-size:.72rem;color:#555;margin-bottom:10px;">Marca: <span style="color:#3483fa;font-weight:700;">'+_escHtml(marca)+'</span>'
      + (meta.tipo_mat?' &nbsp;·&nbsp; <span style="color:#999;">'+meta.tipo_mat+'</span>':'') + '</div>';
  }

  if (item.dim) {
    h += '<div style="font-size:.72rem;color:#555;margin-bottom:10px;">📏 '+_escHtml(item.dim)+'</div>';
  }

  // ── PREÇO — destaque ML ────────────────────────────────────
  h += '<div style="background:#fff;border:1.5px solid #eee;border-radius:10px;padding:14px 16px;margin-bottom:14px;">';
  if ((item.pr||0) > 0) {
    h += '<div style="font-size:1.8rem;font-weight:700;color:#333;line-height:1;margin-bottom:3px;">'
      + 'R$\u00a0' + item.pr.toLocaleString('pt-BR') + '</div>';
    h += '<div style="font-size:.72rem;color:#00a650;font-weight:600;margin-bottom:2px;">✓ Com instalação profissional inclusa</div>';
    if (item.inst>0) {
      h += '<div style="font-size:.68rem;color:#999;">↳ Mão de obra: R$\u00a0' + item.inst.toLocaleString('pt-BR') + '</div>';
    }
  } else {
    h += '<div style="font-size:1rem;color:#999;font-weight:600;">Sob consulta</div>';
  }
  h += '</div>';

  // ── Botões ─────────────────────────────────────────────────
  h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
  h += '<button onclick="_selecionarDetalhe(\''+_escHtml(item.id)+'\',\''+tipo+'\');" '
    + 'style="flex:1;padding:14px;border-radius:8px;border:none;cursor:pointer;'
    + 'background:#3483fa;color:#fff;font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;">Adicionar ao orçamento</button>';
  h += '<button onclick="_compartilharDetalhe(\''+_escHtml(item.id)+'\',\''+tipo+'\');" '
    + 'style="padding:14px 16px;border-radius:8px;border:1px solid #ddd;'
    + 'background:#25d366;color:#fff;font-family:Outfit,sans-serif;font-size:.88rem;cursor:pointer;">📤</button>';
  h += '</div>';

  // ── Garantia ───────────────────────────────────────────────
  if (meta.garantia) {
    h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;'
      + 'background:#f7f7f7;border-radius:8px;margin-bottom:14px;">'
      + '<span style="font-size:1.2rem;">🛡️</span>'
      + '<div><div style="font-size:.62rem;color:#999;">Garantia do fabricante</div>'
      + '<div style="font-size:.8rem;font-weight:700;color:#333;">'+_escHtml(meta.garantia)+'</div></div></div>';
  }

  // ── Descrição ──────────────────────────────────────────────
  if (meta.desc) {
    h += '<div style="margin-bottom:14px;">';
    h += '<div style="font-size:.78rem;font-weight:700;color:#333;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #eee;">Descrição</div>';
    h += '<div style="font-size:.78rem;color:#555;line-height:1.7;">'+_escHtml(meta.desc)+'</div>';
    h += '</div>';
  }

  // ── Características ────────────────────────────────────────
  if (meta.features && meta.features.length) {
    h += '<div style="margin-bottom:14px;">';
    h += '<div style="font-size:.78rem;font-weight:700;color:#333;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #eee;">Características</div>';
    meta.features.forEach(function(f,i){
      h += '<div style="display:flex;align-items:flex-start;gap:8px;font-size:.75rem;color:#555;'
        + 'padding:8px 0;'+(i<meta.features.length-1?'border-bottom:1px solid #f0f0f0;':'')+';">'
        + '<span style="color:#00a650;flex-shrink:0;font-size:.8rem;">✓</span>'+_escHtml(f)+'</div>';
    });
    h += '</div>';
  }

  // ── Especificações ─────────────────────────────────────────
  if (meta.specs) {
    var skeys = Object.keys(meta.specs);
    if (skeys.length) {
      h += '<div style="margin-bottom:14px;">';
      h += '<div style="font-size:.78rem;font-weight:700;color:#333;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #eee;">Especificações</div>';
      h += '<div style="background:#f7f7f7;border-radius:8px;overflow:hidden;">';
      skeys.forEach(function(k,i){
        h += '<div style="display:flex;justify-content:space-between;align-items:center;'
          + 'padding:9px 14px;'+(i<skeys.length-1?'border-bottom:1px solid #eee;':'')+';">'
          + '<span style="font-size:.72rem;color:#777;">'+_escHtml(k)+'</span>'
          + '<span style="font-size:.75rem;font-weight:600;color:#333;">'+_escHtml(meta.specs[k])+'</span></div>';
      });
      h += '</div></div>';
    }
  }

  // Rodapé
  h += '<div style="font-size:.62rem;color:#bbb;text-align:center;padding:8px 0 20px;line-height:1.6;">'
    + 'HR Mármores e Granitos · Pilão Arcado, BA<br>Preço inclui fornecimento + instalação profissional</div>';

  if (idx>=0 && lista.length>1) {
    h += '<div style="text-align:center;font-size:.63rem;color:#ccc;padding-bottom:8px;">'+(idx+1)+' de '+lista.length+'</div>';
  }

  return h;
}

// ─── Swipe touch ──────────────────────────────────────────────
function _bindSwipe(wrap) {
  var startX=0, startY=0;
  wrap.addEventListener('touchstart',function(e){ startX=e.touches[0].clientX; startY=e.touches[0].clientY; },{passive:true});
  wrap.addEventListener('touchend',function(e){
    var dx=e.changedTouches[0].clientX-startX;
    var dy=Math.abs(e.changedTouches[0].clientY-startY);
    if (dy>40||Math.abs(dx)<50) return; // ignora scroll vertical
    if (dx<0) _navegarDetalhe(1); else _navegarDetalhe(-1);
  },{passive:true});
}

// ══════════════════════════════════════════════════════════════
// AÇÕES
// ══════════════════════════════════════════════════════════════
function _selecionarDetalhe(id, tipo) {
  if (typeof pickCuba==='function') { pickCuba(id,tipo); _fecharDetalhe(); return; }
  _fecharDetalhe();
  if (typeof toast==='function') toast('Cuba selecionada!');
}

function _compartilharDetalhe(id, tipo) {
  var lista = tipo==='coz'?(CFG.coz||[]):tipo==='lav'?(CFG.lav||[]):(CFG.ac||[]);
  var item  = lista.find(function(x){ return x.id===id; });
  if (!item) return;
  var meta  = _cubaMeta(item);
  var emp   = CFG.emp||{};
  var preco = _precoFmt(item);
  var marca = meta.marca_logo||item.brand||item.marca||'';

  var txt = '*'+( emp.nome||'HR Mármores')+'*\n'+(emp.tel||'')+'\n\n'
    +'━━━━━━━━━━━━━━━━━━━━\n🚰 *'+(item.nm||'').toUpperCase()+'*\n━━━━━━━━━━━━━━━━━━━━\n\n';
  if (marca)        txt += '🏷️ Marca: '+marca+'\n';
  if (meta.tipo_mat)txt += '🔩 Material: '+meta.tipo_mat+'\n';
  if (item.dim)     txt += '📏 Medidas: '+item.dim+'\n';
  txt += '💰 Preço c/ instalação: *'+preco+'*\n';
  if (meta.garantia)txt += '🛡️ Garantia: '+meta.garantia+'\n';
  if (meta.desc)    txt += '\n'+meta.desc+'\n';
  if (meta.features&&meta.features.length) {
    txt += '\n✅ *Características:*\n';
    meta.features.forEach(function(f){ txt += '• '+f+'\n'; });
  }
  txt += '\n━━━━━━━━━━━━━━━━━━━━\n📍 '+(emp.end||'')+'\n📞 '+(emp.tel||'');
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}

function compartilharCatalogoRico() {
  var lista = _listaFiltrada();
  var emp   = CFG.emp||{};
  var txt = '*'+(emp.nome||'HR Mármores')+'*\n'+(emp.tel||'')+'\n\n━━━━━━━━━━━━━━━━━━━━\n🚰 CATÁLOGO DE CUBAS\n━━━━━━━━━━━━━━━━━━━━\n\n';
  lista.forEach(function(it){
    txt += '◆ *'+(it.item.nm||'')+'*\n';
    if (it.item.dim) txt += '  📏 '+it.item.dim+'\n';
    txt += '  💰 '+_precoFmt(it.item)+'\n\n';
  });
  txt += '━━━━━━━━━━━━━━━━━━━━\n📍 '+(emp.end||'')+'\n📞 '+(emp.tel||'');
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}

// ══════════════════════════════════════════════════════════════
// PDF
// ══════════════════════════════════════════════════════════════
function gerarCatalogoRicoPDF() {
  var lista  = _listaFiltrada();
  var emp    = CFG.emp||{};
  var titulo = _catFiltro==='coz'?'Cubas para Cozinha':_catFiltro==='lav'?'Cubas para Banheiro':_catFiltro==='ac'?'Acessórios':'Catálogo Completo';
  var data   = new Date().toLocaleDateString('pt-BR');

  function card(it) {
    var item  = it.item;
    var meta  = _cubaMeta(item);
    var img   = _cubaImg(item);
    var preco = _precoFmt(item);
    var marca = meta.marca_logo||item.brand||item.marca||'';
    return '<div style="break-inside:avoid;background:#fff;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">'
      +(img?'<img src="'+img+'" style="width:100%;height:140px;object-fit:contain;background:#f9f9f9;display:block;padding:8px;box-sizing:border-box;">':'<div style="height:80px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#ccc;">🚰</div>')
      +'<div style="padding:10px 12px;">'
        +(meta.badge?'<div style="font-size:6.5px;background:#ff6900;color:#fff;display:inline-block;padding:2px 7px;border-radius:3px;margin-bottom:5px;">'+meta.badge+'</div><br>':'')
        +(marca?'<div style="font-size:7px;letter-spacing:1.5px;text-transform:uppercase;color:#3483fa;font-weight:700;margin-bottom:2px;">'+marca+'</div>':'')
        +'<div style="font-size:11px;font-weight:800;color:#333;line-height:1.3;margin-bottom:3px;">'+( item.nm||'')+'</div>'
        +(item.dim?'<div style="font-size:7.5px;color:#999;margin-bottom:4px;">'+item.dim+'</div>':'')
        +(meta.desc?'<div style="font-size:7px;color:#666;line-height:1.5;margin-bottom:6px;border-left:2px solid #3483fa;padding-left:5px;">'+meta.desc.substring(0,100)+'…</div>':'')
        +(meta.features?'<div style="margin-bottom:6px;">'
          +meta.features.slice(0,3).map(function(f){ return '<div style="font-size:7px;color:#555;padding:1px 0;display:flex;gap:4px;"><span style="color:#00a650;">✓</span>'+f+'</div>'; }).join('')
          +'</div>':'')
        +'<div style="background:#f7f7f7;border:1px solid #e0e0e0;border-radius:7px;padding:8px 10px;">'
          +'<div style="font-size:7px;color:#00a650;font-weight:600;margin-bottom:2px;">c/ instalação inclusa</div>'
          +'<div style="font-size:18px;font-weight:900;color:#333;">'+preco+'</div>'
        +'</div>'
      +'</div></div>';
  }

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Catálogo HR Mármores</title>'
    +'<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    +'body{font-family:Arial,sans-serif;background:#f0f0f0;}'
    +'.page{max-width:820px;margin:0 auto;background:#fff;}'
    +'.hdr{background:#fff;border-bottom:3px solid #3483fa;padding:18px 30px;display:flex;justify-content:space-between;align-items:center;}'
    +'.brand{font-size:20px;font-weight:900;color:#333;}'
    +'.brand-sub{font-size:7px;color:#999;letter-spacing:2px;text-transform:uppercase;margin-top:3px;}'
    +'.hdr-r{text-align:right;font-size:12px;color:#3483fa;font-weight:700;}'
    +'.tbar{background:#f7f7f7;border-bottom:1px solid #eee;padding:10px 30px;display:flex;justify-content:space-between;}'
    +'.tbar-t{font-size:14px;font-weight:800;color:#333;}'
    +'.tbar-s{font-size:8px;color:#999;}'
    +'.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:18px 30px;background:#f0f0f0;}'
    +'.foot{background:#333;padding:12px 30px;display:flex;justify-content:space-between;}'
    +'.foot span{font-size:8px;color:rgba(255,255,255,.4);}'
    +'@media print{.page{max-width:100%;}}'
    +'</style></head><body><div class="page">'
    +'<div class="hdr"><div><div class="brand">'+_escHtml(emp.nome||'HR Mármores e Granitos')+'</div><div class="brand-sub">Mármores · Granitos · Cubas · Acessórios</div></div>'
    +'<div class="hdr-r">'+_escHtml(emp.tel||'')+'<br><span style="font-size:9px;color:#999;">'+_escHtml(emp.cidade||emp.end||'')+'</span></div></div>'
    +'<div class="tbar"><div class="tbar-t">🚰 '+titulo+'</div><div class="tbar-s">'+lista.length+' produto'+(lista.length!==1?'s':'')+' · Emitido em '+data+'</div></div>'
    +'<div class="grid">'+lista.map(card).join('')+'</div>'
    +'<div class="foot"><span>CNPJ: '+_escHtml(emp.cnpj||'—')+'</span><span>'+_escHtml(emp.end||'')+'</span></div>'
    +'</div><script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script></body></html>';

  var blob=new Blob([html],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='Catalogo_Cubas_HR.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},8000);
  if (typeof toast==='function') toast('📥 Catálogo baixado!');
}
