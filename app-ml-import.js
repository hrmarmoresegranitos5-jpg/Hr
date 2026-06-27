// ══════════════════════════════════════════════════════════════
// APP-ML-IMPORT.JS  — Importador de Cubas do Mercado Livre
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Drop-in: adicione no index.html APÓS app-config.js
//   <script src="app-ml-import.js"></script>
//
// O que faz:
//  • Injeta botão "🛒 Importar do ML" nas abas de cubas (cfg tab 1 e 2)
//  • Modal com campo de URL + busca via API pública do ML (sem chave)
//  • Preview: foto, nome editável, dimensões, preço custo + venda c/ margem
//  • Galeria de miniaturas clicáveis (fotos do anúncio)
//  • Salva em CFG.coz ou CFG.lav com _ml_id para deduplicação
//  • Popula CUBA_META automaticamente (se o objeto existir)
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Estado interno ────────────────────────────────────────
  var _ml = {
    loading:  false,
    data:     null,   // dados brutos do ML
    selPhoto: null,   // url da foto escolhida
    margem:   30,     // % de margem padrão
    cat:      'coz',  // 'coz' | 'lav'
    urlAtual: '',     // preserva o input entre renders
  };

  // ─── Utilitários ───────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _fmt(n) {
    return 'R$\u00a0' + Number(n).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // Extrai MLB... de qualquer link do ML
  function _extractId(url) {
    url = url.trim();
    // /p/MLB... (catálogo)
    var m = url.match(/\/p\/(MLB\d+)/i);
    if (m) return {id: m[1], isCatalog: true};
    // parâmetro wid=MLB... (links /up/ de compartilhamento — wid pode vir após ? ou & ou #)
    m = url.match(/[?&#]wid=(MLB\d+)/i);
    if (m) return {id: m[1], isCatalog: false};
    // parâmetro pdp_filters=item_id:MLB...
    m = url.match(/item_id:(MLB\d+)/i);
    if (m) return {id: m[1], isCatalog: false};
    // /MLB... direto no path
    m = url.match(/\/(MLB\d+)/i);
    if (m) return {id: m[1], isCatalog: false};
    // formato hifenizado /MLB-123456789-titulo
    m = url.match(/\/(MLB)-(\d+)/i);
    if (m) return {id: m[1].toUpperCase() + m[2], isCatalog: false};
    // apenas o id digitado
    m = url.match(/^(MLB\d+)$/i);
    if (m) return {id: m[1], isCatalog: false};
    return null;
  }

  // ─── API do ML ─────────────────────────────────────────────
  // Busca via Anthropic API com web_search — bypassa todos os bloqueios
  function _fetchViaAnthropic(id, cb) {
    var prompt = 'Busque no Mercado Livre Brasil o produto com ID ' + id + '. '
      + 'Retorne APENAS um JSON válido (sem markdown, sem texto extra) com os campos: '
      + '{"title":"nome do produto","price":999.99,"pictures":[{"url":"https://...jpg"}],'
      + '"attributes":[{"id":"DIM","name":"Dimensões","value_name":"47x30x17cm"}],'
      + '"permalink":"url do produto"}. '
      + 'Se não encontrar, retorne {"error":"nao encontrado"}.';

    _showStatus('⏳ Buscando via IA...', 'info');

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })
    .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
    .then(function(resp) {
      // Extrair texto da resposta
      var texto = (resp.content || [])
        .filter(function(b) { return b.type === 'text'; })
        .map(function(b) { return b.text; })
        .join('');
      // Limpar markdown se vier
      if (texto.indexOf('```') !== -1) { texto = texto.split('```').filter(function(p){ return p && p.indexOf('{') !== -1; })[0] || texto; } texto = texto.trim();
      var dados;
      try { dados = JSON.parse(texto); } catch(e) {
        cb('Resposta inválida da IA: ' + texto.slice(0,100), null); return;
      }
      if (dados.error) { cb(dados.error, null); return; }
      // Normalizar formato
      dados.id = id;
      dados._via_anthropic = true;
      cb(null, dados);
    })
    .catch(function(e) { cb(String(e), null); });
  }

  // Scraping da página HTML do produto ML via proxy de texto
  function _fetchPaginaML(itemId, cb) {
    var urlProd = 'https://www.mercadolivre.com.br/' + itemId.replace(/^MLB/i,'MLB-') + '-x.html';
    // Proxies que retornam HTML como texto
    var proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(urlProd),
      'https://corsproxy.io/?url=' + encodeURIComponent(urlProd),
      'https://api.allorigins.win/get?url=' + encodeURIComponent(urlProd)
    ];
    function tentar(lista) {
      if (!lista.length) { cb('Falha ao acessar página do produto', null); return; }
      var proxyUrl = lista[0];
      var isGet = proxyUrl.indexOf('/get?') !== -1;
      var done = false;
      var timer = setTimeout(function() {
        if (!done) { done = true; tentar(lista.slice(1)); }
      }, 12000);
      fetch(proxyUrl)
        .then(function(r) { return r.ok ? (isGet ? r.json() : r.text()) : Promise.reject('HTTP ' + r.status); })
        .then(function(resp) {
          if (!done) {
            done = true;
            clearTimeout(timer);
            var html = isGet ? (resp.contents || '') : resp;
            cb(null, html);
          }
        })
        .catch(function() {
          if (!done) { done = true; clearTimeout(timer); tentar(lista.slice(1)); }
        });
    }
    tentar(proxies);
  }

  // Extrai dados estruturados do HTML da página do ML
  function _parsearHTML(html, id) {
    // 1. JSON-LD (schema.org/Product) — mais rico
    var jldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    var produto = null;
    for (var i = 0; i < jldMatch.length; i++) {
      try {
        var txt = jldMatch[i].replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        var obj = JSON.parse(txt);
        if (obj['@type'] === 'Product' || (obj.name && obj.offers)) { produto = obj; break; }
      } catch(e) {}
    }
    // 2. __INITIAL_STATE__ / window.__PRELOADED_STATE__ do React/Next
    var stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    var stateObj = null;
    if (stateMatch) { try { stateObj = JSON.parse(stateMatch[1]); } catch(e) {} }

    // 3. Meta tags OG
    function meta(prop) {
      var re1 = new RegExp('<meta[^>]*(?:property|name)=[\\x22\\x27]' + prop + '[\\x22\\x27][^>]*content=[\\x22\\x27]([^\\x22\\x27]+)[\\x22\\x27]', 'i');
      var re2 = new RegExp('<meta[^>]*content=[\\x22\\x27]([^\\x22\\x27]+)[\\x22\\x27][^>]*(?:property|name)=[\\x22\\x27]' + prop + '[\\x22\\x27]', 'i');
      var m = html.match(re1) || html.match(re2);
      return m ? m[1] : '';
    }

    var titulo = '';
    var preco  = 0;
    var fotos  = [];
    var attrs  = [];

    if (produto) {
      titulo = produto.name || '';
      if (produto.offers) {
        var oferta = Array.isArray(produto.offers) ? produto.offers[0] : produto.offers;
        preco = parseFloat(oferta.price || oferta.lowPrice || 0);
      }
      // Imagens do JSON-LD
      if (produto.image) {
        var imgs = Array.isArray(produto.image) ? produto.image : [produto.image];
        fotos = imgs.map(function(img) { return typeof img === 'string' ? img : (img.url || img.contentUrl || ''); }).filter(Boolean);
      }
      if (produto.description) attrs.push({id:'DESC',name:'Descrição',value_name:produto.description.slice(0,200)});
    }

    // Fallback para meta tags
    if (!titulo) titulo = meta('og:title') || meta('twitter:title') || '';
    if (!fotos.length) {
      var ogImg = meta('og:image');
      if (ogImg) fotos = [ogImg];
    }

    // Procurar preço no HTML se não achamos
    if (!preco) {
      var precoMatch = html.match(/class="[^"]*price[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i)
                    || html.match(/"price"\s*:\s*([\d.]+)/);
      if (precoMatch) preco = parseFloat(precoMatch[1].replace(',','.'));
    }

    // Procurar mais imagens no HTML
    if (fotos.length < 2) {
      var imgMatches = html.match(/https?:\/\/http2\.mlstatic\.com\/[^"'\s]+\.jpg/g) || [];
      imgMatches = imgMatches.filter(function(u) { return u.indexOf('-O.jpg') !== -1 || u.indexOf('_O.jpg') !== -1 || fotos.length < 2; });
      fotos = fotos.concat(imgMatches).filter(function(u,i,a){ return a.indexOf(u) === i; });
    }

    // Sintetizar objeto compatível com o formato da API real
    return {
      id:         id,
      title:      titulo || ('Produto ' + id),
      price:      preco,
      pictures:   fotos.slice(0,8).map(function(u) { return {url: u}; }),
      attributes: attrs,
      permalink:  'https://www.mercadolivre.com.br/' + id.replace(/^MLB/i,'MLB-') + '-x.html',
      _scraped:   true
    };
  }

  function _fetchItem(id, cb) {
    // Tenta scraping HTML primeiro, depois Anthropic como fallback
    _fetchPaginaML(id, function(err, html) {
      var dados = html ? _parsearHTML(html, id) : null;
      if (dados && dados.title && dados.title !== ('Produto ' + id)) {
        cb(null, dados); return;
      }
      // Fallback: busca via Anthropic com web_search
      _fetchViaAnthropic(id, cb);
    });
  }

  function _fetchDesc(id, cb) {
    var base = 'https://api.mercadolibre.com/items/' + id + '/description';
    var opts = { method: 'GET', mode: 'cors', credentials: 'omit',
                 headers: { 'Accept': 'application/json' } };
    var urls = [
      base,
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base),
      'https://thingproxy.freeboard.io/fetch/' + base
    ];
    _tentarUrls(urls, opts, function(err, d) {
      if (err || !d) { cb(null, ''); return; }
      if (d && d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      cb(null, d.plain_text || '');
    });
  }

  // Resolve catálogo → item principal
  function _fetchCatalog(id, cb) {
    var base = 'https://api.mercadolibre.com/products/' + id;
    var opts = { method: 'GET', mode: 'cors', credentials: 'omit',
                 headers: { 'Accept': 'application/json' } };
    var urls = [
      base,
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base),
      'https://thingproxy.freeboard.io/fetch/' + base
    ];
    _tentarUrls(urls, opts, function(err, d) {
      if (err || !d) { cb(err || 'sem resposta', null); return; }
      if (d && d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      var itemId = (d.buy_box_winner && d.buy_box_winner.item_id) ||
                   (d.items && d.items[0] && d.items[0].id);
      if (itemId) { cb(null, itemId); }
      else { cb('Catálogo sem item vinculado', null); }
    });
  }

  // ─── Busca completa ────────────────────────────────────────
  function _buscar(rawUrl) {
    var info = _extractId(rawUrl);
    if (!info) {
      _showStatus('⚠️ Link inválido. Cole a URL do produto ou o código MLB...', 'warn');
      return;
    }
    _ml.loading = true;
    _ml.data    = null;
    _renderModal();
    _showStatus('⏳ Buscando produto no Mercado Livre...', 'info');

    function carregar(itemId) {
      _fetchItem(itemId, function(err, item) {
        if (err || !item) {
          _ml.loading = false;
          _renderModal();
          var msg = String(err || 'sem resposta');
          _showStatus('❌ Erro: ' + msg, 'error');
          return;
        }
        _fetchDesc(itemId, function(_, desc) {
          _ml.data      = item;
          _ml.data._desc = desc;
          _ml.selPhoto  = _bestPhoto(item);
          _ml.loading   = false;
          _renderModal();
        });
      });
    }

    if (info.isCatalog) {
      _fetchCatalog(info.id, function(err, itemId) {
        if (err || !itemId) {
          // tenta como item direto
          carregar(info.id);
        } else {
          carregar(itemId);
        }
      });
    } else {
      carregar(info.id);
    }
  }

  // ─── Foto principal ────────────────────────────────────────
  function _bestPhoto(item) {
    var pics = item.pictures || [];
    if (!pics.length) return null;
    // prefere qualidade 'O' (original) ou a maior disponível
    var best = pics[0];
    pics.forEach(function(p) {
      if ((p.size || '').includes('O')) best = p;
    });
    return (best.url || best.secure_url || null);
  }

  function _allPhotos(item) {
    return (item.pictures || []).map(function(p){
      return p.url || p.secure_url || '';
    }).filter(Boolean).slice(0, 8);
  }

  // ─── Inferências ───────────────────────────────────────────
  function _inferDim(item) {
    var atrs = item.attributes || [];
    var dims = [];
    atrs.forEach(function(a){
      var id = (a.id||'').toLowerCase();
      if (id.includes('length') || id.includes('width') || id.includes('height') ||
          id.includes('comprimento') || id.includes('largura') || id.includes('altura') ||
          id.includes('profundidade')) {
        var v = a.value_name || '';
        if (v) dims.push(v);
      }
    });
    if (dims.length >= 2) return dims.slice(0,3).join(' × ');
    // fallback: título pode conter dimensões
    var m = (item.title||'').match(/(\d{2,3})\s*[xXx×]\s*(\d{2,3})/);
    if (m) return m[1] + '×' + m[2] + 'cm';
    return '';
  }

  function _inferFeatures(item) {
    var atrs = item.attributes || [];
    var feats = [];
    var skip = ['ITEM_CONDITION','GTIN','BRAND','EAN','MODEL','COLOR'];
    atrs.forEach(function(a){
      if (skip.indexOf(a.id) >= 0) return;
      if (a.value_name && a.name) {
        feats.push(a.name + ': ' + a.value_name);
      }
    });
    return feats.slice(0, 6);
  }

  function _inferBadge(item) {
    if (item.health && item.health > 0.85) return '⭐ Destaque ML';
    if ((item.sold_quantity||0) > 500) return '🔥 Mais Vendido';
    return '';
  }

  function _inferTipoMat(item) {
    var txt = ((item.title||'') + ' ' + (item._desc||'')).toLowerCase();
    if (txt.includes('louça') || txt.includes('cerâmica') || txt.includes('porcelana')) return 'Louça';
    if (txt.includes('granito') || txt.includes('mármore')) return 'Pedra';
    if (txt.includes('inox') || txt.includes('aço')) return 'Inox';
    return 'Inox';
  }

  // ─── Preço de venda calculado ─────────────────────────────
  function _precoVenda(custo, margem) {
    return custo * (1 + margem / 100);
  }

  // ─── Baixar foto para base64 ─────────────────────────────
  function _downloadFotoB64(url, cb) {
    // Usa canvas para redimensionar (≤500px) igual ao onFile existente
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW   = 500;
      var scale  = Math.min(1, maxW / img.width);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = function() { cb(null); };
    img.src = url;
  }

  // ─── Salvar cuba no CFG ───────────────────────────────────
  function _salvar() {
    var d = _ml.data;
    if (!d) return;

    var el    = document.getElementById('ml-nome');
    var elDim = document.getElementById('ml-dim');
    var elMg  = document.getElementById('ml-margem');
    var elPr  = document.getElementById('ml-pr-venda');

    var nome   = (el   ? el.value.trim()  : d.title) || d.title;
    var dim    = (elDim? elDim.value.trim(): '') || _inferDim(d);
    var margem = elMg  ? (parseFloat(elMg.value)||0) : _ml.margem;
    var custo  = d.price || 0;
    var venda  = elPr  ? (parseFloat((elPr.textContent||'').replace(/[^\d,]/g,'').replace(',','.'))||0)
                       : _precoVenda(custo, margem);
    if (!venda) venda = _precoVenda(custo, margem);

    var brand = (d.attributes||[]).reduce(function(acc,a){
      return a.id==='BRAND' ? (a.value_name||acc) : acc;
    }, '');

    var tipoMat = _inferTipoMat(d);
    var features = _inferFeatures(d);
    var badge    = _inferBadge(d);
    var cat      = _ml.cat;

    _showStatus('⏳ Baixando foto...', 'info');

    function _salvarComFoto(b64) {
      var novaCuba = {
        id:       'ml_' + d.id + '_' + Date.now(),
        nm:       nome,
        brand:    brand || 'ML Import',
        dim:      dim,
        pr:       Math.round(venda),
        inst:     cat === 'coz' ? 110 : 220,
        instCli:  cat === 'coz' ? 160 : 280,
        photo:    b64 || '',
        // campos internos ML
        _ml_id:        d.id,
        _ml_preco_custo: custo,
        _ml_margem:    margem,
        _ml_url:       d.permalink || '',
      };

      // deduplicação por _ml_id
      var lista = cat === 'coz' ? CFG.coz : CFG.lav;
      var idx   = lista.findIndex(function(c){ return c._ml_id === d.id; });
      if (idx >= 0) {
        lista[idx] = novaCuba;
      } else {
        lista.push(novaCuba);
      }

      // Popula CUBA_META se disponível
      if (typeof CUBA_META !== 'undefined') {
        var key = 'ml_' + d.id;
        CUBA_META[key] = {
          badge:    badge,
          desc:     d._desc || '',
          features: features,
          garantia: '',
          tipo_mat: tipoMat,
          marca_logo: (brand || 'ML').toUpperCase(),
        };
      }

      if (typeof svCFG   === 'function') svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      if (typeof buildCfg === 'function') buildCfg();
      if (typeof toast   === 'function') toast('✅ Cuba importada do ML e salva!');

      _fecharModal();
    }

    if (_ml.selPhoto) {
      _downloadFotoB64(_ml.selPhoto, _salvarComFoto);
    } else {
      _salvarComFoto(null);
    }
  }

  // ══════════════════════════════════════════════════════════
  // MODAL HTML
  // ══════════════════════════════════════════════════════════
  function _renderModal() {
    var wrap = document.getElementById('mlImportModal');
    if (!wrap) return;

    // preserva o valor do input antes de reescrever o DOM
    var inpAntes = document.getElementById('ml-url-inp');
    if (inpAntes && inpAntes.value) _ml.urlAtual = inpAntes.value;

    var d = _ml.data;
    var h = '';

    // ── Cabeçalho ──────────────────────────────────────────
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">';
    h += '<div style="font-size:1.6rem;">🛒</div>';
    h += '<div style="flex:1;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--tx);">Importar do Mercado Livre</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);">Cole o link do produto ou código MLB…</div>';
    h += '</div>';
    h += '<button onclick="_mlFecharModal()" style="background:none;border:none;color:var(--t3);'
       + 'font-size:1.3rem;cursor:pointer;line-height:1;padding:4px 8px;">✕</button>';
    h += '</div>';

    // ── Campo categoria ───────────────────────────────────
    h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
    ['coz','lav'].forEach(function(c){
      var ativ = _ml.cat === c;
      var lab  = c === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
      h += '<button onclick="_mlSetCat(\'' + c + '\')" '
         + 'style="flex:1;padding:9px;border-radius:10px;font-size:.75rem;font-weight:600;cursor:pointer;'
         + 'border:1px solid ' + (ativ?'var(--gold2)':'var(--bd2)') + ';'
         + 'background:' + (ativ?'var(--gdim)':'var(--s3)') + ';'
         + 'color:' + (ativ?'var(--gold2)':'var(--t2)') + ';">'
         + lab + '</button>';
    });
    h += '</div>';

    // ── Campo de URL ──────────────────────────────────────
    h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    h += '<input id="ml-url-inp" type="text" placeholder="https://www.mercadolivre.com.br/... ou MLB123456789" '
       + 'style="flex:1;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;'
       + 'padding:10px 12px;color:var(--tx);font-size:.78rem;outline:none;" '
       + 'oninput="_ml.urlAtual=this.value" '
       + 'onpaste="var s=this;setTimeout(function(){_ml.urlAtual=s.value;},10)" '
       + 'onkeydown="if(event.key===\'Enter\')_mlBuscar()">';
    h += '<button onclick="_mlBuscar()" '
       + 'style="padding:10px 16px;border-radius:10px;border:none;cursor:pointer;'
       + 'background:linear-gradient(135deg,#a07828,var(--gold2));color:#0f0c00;'
       + 'font-size:.8rem;font-weight:700;">'
       + (_ml.loading ? '⏳' : '🔍 Buscar') + '</button>';
    h += '</div>';

    // ── Status ────────────────────────────────────────────
    h += '<div id="ml-status" style="min-height:18px;font-size:.72rem;'
       + 'color:var(--t3);margin-bottom:8px;"></div>';

    // ── Preview ───────────────────────────────────────────
    if (d && !_ml.loading) {
      var fotos   = _allPhotos(d);
      var custo   = d.price || 0;
      var venda   = _precoVenda(custo, _ml.margem);
      var dim     = _inferDim(d);
      var brand   = (d.attributes||[]).reduce(function(acc,a){
                      return a.id==='BRAND' ? (a.value_name||acc) : acc;
                    }, '');

      h += '<div style="background:var(--s3);border-radius:14px;padding:14px;border:1px solid var(--bd2);">';

      // Galeria de miniaturas
      if (fotos.length > 1) {
        h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">';
        fotos.forEach(function(url, i) {
          var sel = _ml.selPhoto === url;
          h += '<img src="' + _esc(url) + '" '
             + 'onclick="_mlSelecionarFoto(' + i + ')" '
             + 'style="width:58px;height:58px;object-fit:cover;border-radius:8px;cursor:pointer;'
             + 'flex-shrink:0;border:2px solid ' + (sel?'var(--gold2)':'transparent') + ';'
             + 'box-sizing:border-box;" loading="lazy">';
        });
        h += '</div>';
      }

      // Foto selecionada grande
      if (_ml.selPhoto) {
        h += '<div style="background:var(--s2);border-radius:12px;overflow:hidden;'
           + 'aspect-ratio:4/3;margin-bottom:12px;">';
        h += '<img src="' + _esc(_ml.selPhoto) + '" '
           + 'style="width:100%;height:100%;object-fit:contain;padding:16px;box-sizing:border-box;" '
           + 'loading="lazy">';
        h += '</div>';
      }

      // Nome editável
      h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Nome (editável)</div>';
      h += '<input id="ml-nome" type="text" value="' + _esc(d.title) + '" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:9px 11px;color:var(--tx);font-size:.8rem;font-weight:600;'
         + 'box-sizing:border-box;outline:none;margin-bottom:10px;">';

      // Linha: marca + dimensões
      h += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
      if (brand) {
        h += '<div style="flex:1;">';
        h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Marca</div>';
        h += '<div style="font-size:.78rem;color:var(--t2);">' + _esc(brand) + '</div>';
        h += '</div>';
      }
      h += '<div style="flex:1;">';
      h += '<div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Dimensões</div>';
      h += '<input id="ml-dim" type="text" value="' + _esc(dim) + '" placeholder="ex: 60×40cm" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;'
         + 'padding:7px 9px;color:var(--tx);font-size:.78rem;box-sizing:border-box;outline:none;">';
      h += '</div>';
      h += '</div>';

      // Preços
      h += '<div style="background:var(--gdim);border:1px solid var(--gold3);border-radius:11px;'
         + 'padding:12px 14px;margin-bottom:10px;">';

      // Linha custo + margem
      h += '<div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">';
      h += '<div style="flex:1;">';
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Preço de custo (ML)</div>';
      h += '<div style="font-size:1.1rem;font-weight:700;color:var(--t2);">' + _fmt(custo) + '</div>';
      h += '</div>';

      h += '<div style="width:80px;">';
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:3px;">Margem %</div>';
      h += '<input id="ml-margem" type="number" min="0" max="300" step="1" value="' + _ml.margem + '" '
         + 'oninput="_mlAtualizarPreco(this.value)" '
         + 'style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;'
         + 'padding:6px 8px;color:var(--tx);font-size:.85rem;font-weight:700;'
         + 'box-sizing:border-box;outline:none;text-align:center;">';
      h += '</div>';
      h += '</div>';

      // Preço de venda
      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
      h += '<div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;'
         + 'letter-spacing:1px;">Preço de venda calculado</div>';
      h += '<div id="ml-pr-venda" style="font-family:\'Cormorant Garamond\',serif;'
         + 'font-size:1.6rem;font-weight:700;color:var(--gold2);">'
         + _fmt(venda) + '</div>';
      h += '</div>';

      h += '</div>';

      // Aviso interno
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:12px;'
         + 'padding:7px 10px;background:rgba(0,0,0,.2);border-radius:8px;'
         + 'border-left:2px solid var(--t4);">'
         + '🔒 Preço de custo é dado interno — não aparece para clientes.</div>';

      // Botão salvar
      h += '<button onclick="_mlSalvar()" '
         + 'style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;'
         + 'background:linear-gradient(135deg,#a07828,var(--gold2));'
         + 'color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">'
         + '✓ Salvar cuba importada</button>';

      h += '</div>'; // fim preview box
    }

    wrap.innerHTML = h;

    // Restaura o valor do input de URL após reescrever o DOM
    var inp = document.getElementById('ml-url-inp');
    if (inp && _ml.urlAtual) inp.value = _ml.urlAtual;
    if (inp && !d) setTimeout(function(){ inp.focus(); }, 80);
  }

  function _showStatus(msg, tipo) {
    var el = document.getElementById('ml-status');
    if (!el) return;
    var cor = tipo === 'error' ? '#e05555'
            : tipo === 'warn'  ? '#c9a840'
            : tipo === 'ok'    ? '#4ade80'
            : 'var(--t3)';
    el.style.color = cor;
    el.textContent  = msg;
  }

  // ══════════════════════════════════════════════════════════
  // OVERLAY / MODAL  (reutiliza o estilo .ov do sistema)
  // ══════════════════════════════════════════════════════════
  function _abrirModal(cat) {
    _ml.cat      = cat || 'coz';
    _ml.data     = null;
    _ml.loading  = false;
    _ml.selPhoto = null;
    _ml.urlAtual = '';

    // Cria overlay se ainda não existe
    if (!document.getElementById('mlImportOv')) {
      var ov = document.createElement('div');
      ov.id  = 'mlImportOv';
      ov.style.cssText = [
        'position:fixed','top:0','left:0','right:0','bottom:0',
        'z-index:9999',
        'background:rgba(0,0,0,.72)',
        'display:flex','align-items:flex-end','justify-content:center',
        'backdrop-filter:blur(4px)','-webkit-backdrop-filter:blur(4px)',
      ].join(';');
      ov.onclick = function(e){ if(e.target===ov) _fecharModal(); };

      var box = document.createElement('div');
      box.id  = 'mlImportBox';
      box.style.cssText = [
        'background:var(--s1,#131217)',
        'border-radius:20px 20px 0 0',
        'width:100%','max-width:520px',
        'max-height:90dvh','overflow-y:auto',
        'padding:20px 16px 32px',
        'box-sizing:border-box',
      ].join(';');

      var inner = document.createElement('div');
      inner.id  = 'mlImportModal';
      box.appendChild(inner);
      ov.appendChild(box);
      document.body.appendChild(ov);
    }

    document.getElementById('mlImportOv').style.display = 'flex';
    _renderModal();
  }

  function _fecharModal() {
    var ov = document.getElementById('mlImportOv');
    if (ov) ov.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════
  // FUNÇÕES GLOBAIS  (chamadas pelo HTML gerado)
  // ══════════════════════════════════════════════════════════
  window._mlAbrirModal   = _abrirModal;
  window._mlFecharModal  = _fecharModal;

  window._mlSetCat = function(cat) {
    _ml.cat = cat;
    _renderModal();
  };

  window._mlBuscar = function() {
    var inp = document.getElementById('ml-url-inp');
    // tenta o valor do input; fallback para o urlAtual salvo
    var url = (inp ? inp.value.trim() : '') || _ml.urlAtual || '';
    if (!url) {
      _showStatus('⚠️ Cole o link antes de buscar.', 'warn');
      return;
    }
    _ml.urlAtual = url;
    _ml.data     = null;
    _ml.selPhoto = null;
    _buscar(url);
  };

  window._mlSelecionarFoto = function(idx) {
    var d = _ml.data;
    if (!d) return;
    var fotos = _allPhotos(d);
    _ml.selPhoto = fotos[idx] || null;
    _renderModal();
    // mantém o valor do input de url
    var inp = document.getElementById('ml-url-inp');
    if (inp) inp.value = (d.permalink || '');
  };

  window._mlAtualizarPreco = function(val) {
    _ml.margem = parseFloat(val) || 0;
    var d = _ml.data;
    if (!d) return;
    var el = document.getElementById('ml-pr-venda');
    if (el) el.textContent = _fmt(_precoVenda(d.price || 0, _ml.margem));
  };

  window._mlSalvar = _salvar;

  // Os botões "🛒 Importar do Mercado Livre" são injetados
  // diretamente pelo app-core.js via buildCfg() — não precisa de monkey-patch aqui.

  window.abrirMLImport = _abrirModal;

})();
