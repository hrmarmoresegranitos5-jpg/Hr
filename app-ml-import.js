// ══════════════════════════════════════════════════════════════
// APP-ML-IMPORT.JS  — Importador de Cubas do Mercado Livre
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// Drop-in: adicione no index.html APÓS app-config.js
//   <script src="app-ml-import.js"></script>
//
// Estratégia de busca (em cascata):
//  1. API pública do ML  (api.mercadolibre.com — sem autenticação)
//  2. Scraping HTML via proxies CORS (allorigins → corsproxy → thingproxy)
//  3. Anthropic Claude com web_search (usa CFG.emp.apiKey, multi-turn correto)
//
// O que faz:
//  • Injeta botão "🛒 Importar do ML" nas abas de cubas (cfg tab 1 e 2)
//  • Modal com campo de URL + busca em cascata
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
    data:     null,
    selPhoto: null,
    margem:   30,
    cat:      'coz',
    urlAtual: '',
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
    var m;
    // /p/MLB... (catálogo)
    m = url.match(/\/p\/(MLB\d+)/i);
    if (m) return {id: m[1].toUpperCase(), isCatalog: true};
    // parâmetro wid=MLB...
    m = url.match(/[?&#]wid=(MLB\d+)/i);
    if (m) return {id: m[1].toUpperCase(), isCatalog: false};
    // pdp_filters=item_id:MLB...
    m = url.match(/item_id:(MLB\d+)/i);
    if (m) return {id: m[1].toUpperCase(), isCatalog: false};
    // /MLB... direto no path
    m = url.match(/\/(MLB\d+)/i);
    if (m) return {id: m[1].toUpperCase(), isCatalog: false};
    // formato hifenizado /MLB-123456789
    m = url.match(/\/(MLB)-(\d+)/i);
    if (m) return {id: 'MLB' + m[2], isCatalog: false};
    // apenas o id digitado
    m = url.match(/^(MLB\d+)$/i);
    if (m) return {id: m[1].toUpperCase(), isCatalog: false};
    return null;
  }

  // Tenta uma lista de URLs em sequência até uma responder OK
  function _tentarUrls(urls, opts, cb) {
    if (!urls.length) { cb('Todas as tentativas falharam', null); return; }
    var url  = urls[0];
    var rest = urls.slice(1);
    var done = false;
    var timer = setTimeout(function() {
      if (!done) { done = true; _tentarUrls(rest, opts, cb); }
    }, 10000);
    fetch(url, opts)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(d) {
        if (!done) { done = true; clearTimeout(timer); cb(null, d); }
      })
      .catch(function() {
        if (!done) { done = true; clearTimeout(timer); _tentarUrls(rest, opts, cb); }
      });
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 1 — API pública do Mercado Livre (sem auth)
  // ══════════════════════════════════════════════════════════
  function _fetchApiML(id, cb) {
    var base = 'https://api.mercadolibre.com/items/' + id;
    var opts = { method: 'GET', mode: 'cors', credentials: 'omit',
                 headers: { 'Accept': 'application/json' } };
    // Tentativas: direto + via proxies CORS
    var urls = [
      base,
      'https://corsproxy.io/?url=' + encodeURIComponent(base),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(base),
      'https://thingproxy.freeboard.io/fetch/' + base
    ];
    _tentarUrls(urls, opts, function(err, d) {
      if (err || !d || !d.title) { cb(err || 'sem dados', null); return; }
      // allorigins /get encapsula em .contents
      if (d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      cb(null, d);
    });
  }

  // Descrição do item (complemento opcional — não bloqueia)
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
      if (d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
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
      if (d.contents) { try { d = JSON.parse(d.contents); } catch(e) {} }
      var itemId = (d.buy_box_winner && d.buy_box_winner.item_id) ||
                   (d.items && d.items[0] && d.items[0].id);
      if (itemId) { cb(null, itemId); }
      else { cb('Catálogo sem item vinculado', null); }
    });
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 2 — Scraping HTML via proxies CORS
  // ══════════════════════════════════════════════════════════
  function _fetchPaginaML(itemId, cb) {
    var urlProd = 'https://www.mercadolivre.com.br/' + itemId.replace(/^MLB/i,'MLB-') + '-x.html';
    var proxies = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(urlProd),
      'https://corsproxy.io/?url=' + encodeURIComponent(urlProd),
      'https://api.allorigins.win/get?url='  + encodeURIComponent(urlProd),
      'https://thingproxy.freeboard.io/fetch/' + urlProd
    ];
    function tentar(lista) {
      if (!lista.length) { cb('Falha ao acessar página do produto', null); return; }
      var proxyUrl = lista[0];
      var isGet    = proxyUrl.indexOf('/get?') !== -1;
      var done     = false;
      var timer    = setTimeout(function() {
        if (!done) { done = true; tentar(lista.slice(1)); }
      }, 12000);
      fetch(proxyUrl)
        .then(function(r) { return r.ok ? (isGet ? r.json() : r.text()) : Promise.reject('HTTP ' + r.status); })
        .then(function(resp) {
          if (!done) {
            done = true; clearTimeout(timer);
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

  function _parsearHTML(html, id) {
    // 1. JSON-LD (schema.org/Product)
    var jldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    var produto   = null;
    for (var i = 0; i < jldMatch.length; i++) {
      try {
        var txt = jldMatch[i].replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        var obj = JSON.parse(txt);
        if (obj['@type'] === 'Product' || (obj.name && obj.offers)) { produto = obj; break; }
      } catch(e) {}
    }

    // 2. Meta tags OG
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
      if (produto.image) {
        var imgs = Array.isArray(produto.image) ? produto.image : [produto.image];
        fotos = imgs.map(function(img) {
          return typeof img === 'string' ? img : (img.url || img.contentUrl || '');
        }).filter(Boolean);
      }
      if (produto.description) attrs.push({id:'DESC',name:'Descrição',value_name:produto.description.slice(0,200)});
    }

    if (!titulo) titulo = meta('og:title') || meta('twitter:title') || '';
    if (!fotos.length) {
      var ogImg = meta('og:image');
      if (ogImg) fotos = [ogImg];
    }

    if (!preco) {
      var precoMatch = html.match(/class="[^"]*price[^"]*"[^>]*>\s*R\$\s*([\d.,]+)/i)
                    || html.match(/"price"\s*:\s*([\d.]+)/);
      if (precoMatch) preco = parseFloat(precoMatch[1].replace(',','.'));
    }

    if (fotos.length < 2) {
      var imgMatches = html.match(/https?:\/\/http2\.mlstatic\.com\/[^"'\s]+\.jpg/g) || [];
      fotos = fotos.concat(imgMatches).filter(function(u,i,a){ return a.indexOf(u) === i; }).slice(0,8);
    }

    if (!titulo || titulo === ('Produto ' + id)) return null;

    return {
      id:         id,
      title:      titulo,
      price:      preco,
      pictures:   fotos.slice(0,8).map(function(u) { return {url: u}; }),
      attributes: attrs,
      permalink:  'https://www.mercadolivre.com.br/' + id.replace(/^MLB/i,'MLB-') + '-x.html',
      _scraped:   true
    };
  }

  // ══════════════════════════════════════════════════════════
  // CAMADA 3 — Anthropic Claude com web_search (multi-turn)
  // ══════════════════════════════════════════════════════════
  function _fetchViaAnthropic(id, cb) {
    var apiKey = (typeof CFG !== 'undefined' && CFG.emp && CFG.emp.apiKey) || '';
    if (!apiKey) {
      cb('Produto não encontrado via proxies. Configure a API Key Anthropic em Configurações para habilitar busca por IA.', null);
      return;
    }

    _showStatus('⏳ Buscando via IA (Claude)...', 'info');

    var prompt = 'Pesquise no Mercado Livre Brasil o produto com código ' + id + '. '
      + 'Retorne APENAS um objeto JSON válido, sem markdown, sem texto extra, com esta estrutura: '
      + '{"title":"nome completo do produto","price":999.99,'
      + '"pictures":[{"url":"https://http2.mlstatic.com/...jpg"}],'
      + '"attributes":[{"id":"BRAND","name":"Marca","value_name":"NomeMarca"},{"id":"DIM","name":"Dimensões","value_name":"60x40cm"}],'
      + '"permalink":"https://www.mercadolivre.com.br/MLB-XXXXX-x.html"}. '
      + 'Se não encontrar o produto, retorne: {"error":"não encontrado"}.';

    var messages = [{ role: 'user', content: prompt }];

    // Executa até 3 turnos para processar tool_use → tool_result
    function _turno(msgs, tentativas) {
      if (tentativas <= 0) { cb('Limite de turnos IA atingido', null); return; }

      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: msgs
        })
      })
      .then(function(r) {
        if (!r.ok) {
          return r.text().then(function(body) {
            var msg = 'HTTP ' + r.status;
            if (r.status === 401) msg = 'API Key inválida (401). Verifique em Configurações → API Key Anthropic.';
            else if (r.status === 403) msg = 'Acesso negado (403). Verifique permissões da API Key.';
            else if (r.status === 429) msg = 'Limite de requisições atingido (429). Aguarde e tente novamente.';
            throw new Error(msg);
          });
        }
        return r.json();
      })
      .then(function(resp) {
        var stopReason  = resp.stop_reason;
        var contentBlks = resp.content || [];

        // Coleta todos os blocos de texto para tentar extrair JSON
        var textoFinal = contentBlks
          .filter(function(b) { return b.type === 'text'; })
          .map(function(b)    { return b.text; })
          .join('');

        // Se há tool_use, precisamos fazer outro turno com tool_result
        var toolUseBlocks = contentBlks.filter(function(b) { return b.type === 'tool_use'; });

        if (toolUseBlocks.length > 0 && stopReason === 'tool_use') {
          // Monta tool_result para cada tool_use
          var toolResults = toolUseBlocks.map(function(tb) {
            return {
              type:        'tool_result',
              tool_use_id: tb.id,
              content:     'Busca realizada. Por favor retorne agora APENAS o JSON do produto ' + id + '.'
            };
          });

          // Adiciona a resposta do assistente e os tool_results na conversa
          var novaMsgs = msgs.concat([
            { role: 'assistant', content: contentBlks },
            { role: 'user',      content: toolResults }
          ]);
          _turno(novaMsgs, tentativas - 1);
          return;
        }

        // Tenta extrair JSON da resposta final
        var texto = textoFinal.trim();
        // Remove markdown ```json ... ```
        texto = texto.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        // Extrai o primeiro objeto JSON encontrado
        var jsonMatch = texto.match(/\{[\s\S]*\}/);
        if (!jsonMatch) { cb('IA não retornou JSON válido: ' + texto.slice(0,120), null); return; }

        var dados;
        try { dados = JSON.parse(jsonMatch[0]); }
        catch(e) { cb('JSON inválido da IA: ' + texto.slice(0,120), null); return; }

        if (dados.error) { cb('IA: ' + dados.error, null); return; }
        if (!dados.title) { cb('IA retornou dados incompletos', null); return; }

        dados.id              = id;
        dados._via_anthropic  = true;
        dados.pictures        = dados.pictures || [];
        dados.attributes      = dados.attributes || [];
        dados.permalink       = dados.permalink || ('https://www.mercadolivre.com.br/' + id.replace(/^MLB/i,'MLB-') + '-x.html');
        cb(null, dados);
      })
      .catch(function(e) { cb(String(e.message || e), null); });
    }

    _turno(messages, 4);
  }

  // ══════════════════════════════════════════════════════════
  // ORQUESTRADOR — tenta as 3 camadas em cascata
  // ══════════════════════════════════════════════════════════
  function _fetchItem(id, cb) {
    // Camada 1: API pública do ML
    _showStatus('⏳ Buscando na API do Mercado Livre...', 'info');
    _fetchApiML(id, function(err1, item1) {
      if (!err1 && item1 && item1.title) {
        cb(null, item1);
        return;
      }

      // Camada 2: Scraping HTML
      _showStatus('⏳ Tentando via página do produto...', 'info');
      _fetchPaginaML(id, function(err2, html) {
        var item2 = html ? _parsearHTML(html, id) : null;
        if (item2 && item2.title) {
          cb(null, item2);
          return;
        }

        // Camada 3: Anthropic com web_search
        _fetchViaAnthropic(id, cb);
      });
    });
  }

  // ─── Busca completa (entrada principal) ───────────────────
  function _buscar(rawUrl) {
    var info = _extractId(rawUrl);
    if (!info) {
      _showStatus('⚠️ Link inválido. Cole a URL do produto ou o código MLB...', 'warn');
      return;
    }
    _ml.loading = true;
    _ml.data    = null;
    _ml.selPhoto = null;
    _renderModal();
    _showStatus('⏳ Buscando produto...', 'info');

    function carregar(itemId) {
      _fetchItem(itemId, function(err, item) {
        if (err || !item) {
          _ml.loading = false;
          _renderModal();
          _showStatus('❌ ' + (err || 'Produto não encontrado'), 'error');
          return;
        }
        // Tenta buscar descrição em paralelo (não bloqueia)
        _fetchDesc(itemId, function(_, desc) {
          _ml.data         = item;
          _ml.data._desc   = desc || '';
          _ml.selPhoto     = _bestPhoto(item);
          _ml.loading      = false;
          _renderModal();
          _showStatus('✅ Produto encontrado!', 'ok');
        });
      });
    }

    if (info.isCatalog) {
      _fetchCatalog(info.id, function(err, itemId) {
        carregar(err ? info.id : itemId);
      });
    } else {
      carregar(info.id);
    }
  }

  // ─── Foto principal ────────────────────────────────────────
  function _bestPhoto(item) {
    var pics = item.pictures || [];
    if (!pics.length) return null;
    var best = pics[0];
    pics.forEach(function(p) {
      if ((p.size || '').indexOf('O') !== -1) best = p;
    });
    return best.url || best.secure_url || null;
  }

  function _allPhotos(item) {
    return (item.pictures || []).map(function(p) {
      return p.url || p.secure_url || '';
    }).filter(Boolean).slice(0, 8);
  }

  // ─── Inferências ───────────────────────────────────────────
  function _inferDim(item) {
    var atrs = item.attributes || [];
    var dims = [];
    atrs.forEach(function(a) {
      var id = (a.id || '').toLowerCase();
      if (id.indexOf('length') !== -1 || id.indexOf('width') !== -1 || id.indexOf('height') !== -1 ||
          id.indexOf('comprimento') !== -1 || id.indexOf('largura') !== -1 || id.indexOf('altura') !== -1 ||
          id.indexOf('profundidade') !== -1) {
        var v = a.value_name || '';
        if (v) dims.push(v);
      }
    });
    if (dims.length >= 2) return dims.slice(0, 3).join(' × ');
    var m = (item.title || '').match(/(\d{2,3})\s*[xXx×]\s*(\d{2,3})/);
    if (m) return m[1] + '×' + m[2] + 'cm';
    return '';
  }

  function _inferFeatures(item) {
    var atrs  = item.attributes || [];
    var feats = [];
    var skip  = ['ITEM_CONDITION','GTIN','BRAND','EAN','MODEL','COLOR'];
    atrs.forEach(function(a) {
      if (skip.indexOf(a.id) >= 0) return;
      if (a.value_name && a.name) feats.push(a.name + ': ' + a.value_name);
    });
    return feats.slice(0, 6);
  }

  function _inferBadge(item) {
    if (item.health && item.health > 0.85) return '⭐ Destaque ML';
    if ((item.sold_quantity || 0) > 500)   return '🔥 Mais Vendido';
    return '';
  }

  function _inferTipoMat(item) {
    var txt = ((item.title || '') + ' ' + (item._desc || '')).toLowerCase();
    if (txt.indexOf('louça') !== -1 || txt.indexOf('cerâmica') !== -1 || txt.indexOf('porcelana') !== -1) return 'Louça';
    if (txt.indexOf('granito') !== -1 || txt.indexOf('mármore') !== -1) return 'Pedra';
    if (txt.indexOf('inox') !== -1 || txt.indexOf('aço') !== -1)        return 'Inox';
    return 'Inox';
  }

  function _precoVenda(custo, margem) {
    return custo * (1 + margem / 100);
  }

  // ─── Baixar foto para base64 ─────────────────────────────
  function _downloadFotoB64(url, cb) {
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

    var nome   = (el    ? el.value.trim()   : d.title) || d.title;
    var dim    = (elDim ? elDim.value.trim() : '') || _inferDim(d);
    var margem = elMg   ? (parseFloat(elMg.value) || 0) : _ml.margem;
    var custo  = d.price || 0;
    var venda  = elPr   ? (parseFloat((elPr.textContent || '').replace(/[^\d,]/g,'').replace(',','.')) || 0)
                        : _precoVenda(custo, margem);
    if (!venda) venda = _precoVenda(custo, margem);

    var brand = (d.attributes || []).reduce(function(acc, a) {
      return a.id === 'BRAND' ? (a.value_name || acc) : acc;
    }, '');

    var tipoMat  = _inferTipoMat(d);
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
        _ml_id:         d.id,
        _ml_preco_custo: custo,
        _ml_margem:     margem,
        _ml_url:        d.permalink || '',
      };

      var lista = cat === 'coz' ? CFG.coz : CFG.lav;
      var idx   = lista.findIndex(function(c) { return c._ml_id === d.id; });
      if (idx >= 0) { lista[idx] = novaCuba; }
      else          { lista.push(novaCuba); }

      if (typeof CUBA_META !== 'undefined') {
        CUBA_META['ml_' + d.id] = {
          badge:      badge,
          desc:       d._desc || '',
          features:   features,
          garantia:   '',
          tipo_mat:   tipoMat,
          marca_logo: (brand || 'ML').toUpperCase(),
        };
      }

      if (typeof svCFG        === 'function') svCFG();
      if (typeof buildCubaList === 'function') buildCubaList();
      if (typeof buildCfg     === 'function') buildCfg();
      if (typeof toast        === 'function') toast('✅ Cuba importada do ML e salva!');

      _fecharModal();
    }

    if (_ml.selPhoto) {
      _downloadFotoB64(_ml.selPhoto, _salvarComFoto);
    } else {
      _salvarComFoto(null);
    }
  }

  // ══════════════════════════════════════════════════════════
  // STATUS
  // ══════════════════════════════════════════════════════════
  function _showStatus(msg, tipo) {
    var el = document.getElementById('ml-status');
    if (!el) return;
    var cor = tipo === 'error' ? '#e05555'
            : tipo === 'warn'  ? '#c9a840'
            : tipo === 'ok'    ? '#4ade80'
            : 'var(--t3)';
    el.style.color  = cor;
    el.textContent  = msg;
  }

  // ══════════════════════════════════════════════════════════
  // OVERLAY / MODAL
  // ══════════════════════════════════════════════════════════
  function _abrirModal(cat) {
    _ml.cat      = cat || 'coz';
    _ml.data     = null;
    _ml.loading  = false;
    _ml.selPhoto = null;
    _ml.urlAtual = '';

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
      ov.onclick = function(e) { if (e.target === ov) _fecharModal(); };

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
  // RENDER DO MODAL
  // ══════════════════════════════════════════════════════════
  function _renderModal() {
    var wrap = document.getElementById('mlImportModal');
    if (!wrap) return;

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

    // ── Categoria ─────────────────────────────────────────
    h += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
    ['coz','lav'].forEach(function(c) {
      var ativ = _ml.cat === c;
      var lab  = c === 'coz' ? '🍳 Cozinha' : '🚿 Banhe./Lavabo';
      h += '<button onclick="_mlSetCat(\'' + c + '\')" '
         + 'style="flex:1;padding:9px;border-radius:10px;font-size:.75rem;font-weight:600;cursor:pointer;'
         + 'border:1px solid ' + (ativ ? 'var(--gold2)' : 'var(--bd2)') + ';'
         + 'background:' + (ativ ? 'var(--gdim)' : 'var(--s3)') + ';'
         + 'color:' + (ativ ? 'var(--gold2)' : 'var(--t2)') + ';">'
         + lab + '</button>';
    });
    h += '</div>';

    // ── Campo URL ─────────────────────────────────────────
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
       + 'font-size:.8rem;font-weight:700;white-space:nowrap;">'
       + (_ml.loading ? '⏳' : '🔍 Buscar') + '</button>';
    h += '</div>';

    // ── Status ────────────────────────────────────────────
    h += '<div id="ml-status" style="min-height:18px;font-size:.72rem;'
       + 'color:var(--t3);margin-bottom:8px;"></div>';

    // ── Loading spinner ───────────────────────────────────
    if (_ml.loading) {
      h += '<div style="text-align:center;padding:32px 0;color:var(--t3);font-size:.85rem;">'
         + '<div style="font-size:2rem;margin-bottom:10px;">⏳</div>'
         + 'Buscando produto…<br>'
         + '<span style="font-size:.68rem;opacity:.6;">Tentando API → proxies → IA</span>'
         + '</div>';
    }

    // ── Preview do produto ────────────────────────────────
    if (d && !_ml.loading) {
      var fotos  = _allPhotos(d);
      var custo  = d.price || 0;
      var venda  = _precoVenda(custo, _ml.margem);
      var dim    = _inferDim(d);
      var brand  = (d.attributes || []).reduce(function(acc, a) {
        return a.id === 'BRAND' ? (a.value_name || acc) : acc;
      }, '');

      h += '<div style="background:var(--s3);border-radius:14px;padding:14px;border:1px solid var(--bd2);">';

      // Galeria
      if (fotos.length > 1) {
        h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">';
        fotos.forEach(function(url, i) {
          var sel = _ml.selPhoto === url;
          h += '<img src="' + _esc(url) + '" '
             + 'onclick="_mlSelecionarFoto(' + i + ')" '
             + 'style="width:58px;height:58px;object-fit:cover;border-radius:8px;cursor:pointer;'
             + 'flex-shrink:0;border:2px solid ' + (sel ? 'var(--gold2)' : 'transparent') + ';'
             + 'box-sizing:border-box;" loading="lazy">';
        });
        h += '</div>';
      }

      // Foto grande
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

      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
      h += '<div style="font-size:.6rem;color:var(--gold3);text-transform:uppercase;letter-spacing:1px;">Preço de venda calculado</div>';
      h += '<div id="ml-pr-venda" style="font-family:\'Cormorant Garamond\',serif;'
         + 'font-size:1.6rem;font-weight:700;color:var(--gold2);">' + _fmt(venda) + '</div>';
      h += '</div>';
      h += '</div>';

      // Aviso custo interno
      h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:12px;'
         + 'padding:7px 10px;background:rgba(0,0,0,.2);border-radius:8px;'
         + 'border-left:2px solid var(--t4);">'
         + '🔒 Preço de custo é dado interno — não aparece para clientes.</div>';

      // Fonte dos dados
      if (d._scraped) {
        h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">📄 Dados obtidos via página do produto</div>';
      } else if (d._via_anthropic) {
        h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">🤖 Dados obtidos via IA</div>';
      } else {
        h += '<div style="font-size:.58rem;color:var(--t3);margin-bottom:10px;opacity:.7;">✅ Dados obtidos via API oficial ML</div>';
      }

      // Botão salvar
      h += '<button onclick="_mlSalvar()" '
         + 'style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;'
         + 'background:linear-gradient(135deg,#a07828,var(--gold2));'
         + 'color:#0f0c00;font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;">'
         + '✓ Salvar cuba importada</button>';

      h += '</div>'; // fim preview
    }

    wrap.innerHTML = h;

    // Restaura o valor do input de URL
    var inp = document.getElementById('ml-url-inp');
    if (inp && _ml.urlAtual) inp.value = _ml.urlAtual;
    if (inp && !d && !_ml.loading) setTimeout(function() { inp.focus(); }, 80);
  }

  // ══════════════════════════════════════════════════════════
  // FUNÇÕES GLOBAIS
  // ══════════════════════════════════════════════════════════
  window._mlAbrirModal  = _abrirModal;
  window._mlFecharModal = _fecharModal;
  window.abrirMLImport  = _abrirModal;

  window._mlSetCat = function(cat) {
    _ml.cat = cat;
    _renderModal();
  };

  window._mlBuscar = function() {
    var inp = document.getElementById('ml-url-inp');
    var url = (inp ? inp.value.trim() : '') || _ml.urlAtual || '';
    if (!url) { _showStatus('⚠️ Cole o link antes de buscar.', 'warn'); return; }
    _ml.urlAtual = url;
    _ml.data     = null;
    _ml.selPhoto = null;
    _buscar(url);
  };

  window._mlSelecionarFoto = function(idx) {
    var d = _ml.data;
    if (!d) return;
    var fotos    = _allPhotos(d);
    _ml.selPhoto = fotos[idx] || null;
    _renderModal();
    var inp = document.getElementById('ml-url-inp');
    if (inp) inp.value = _ml.urlAtual || '';
  };

  window._mlAtualizarPreco = function(val) {
    _ml.margem = parseFloat(val) || 0;
    var d = _ml.data;
    if (!d) return;
    var el = document.getElementById('ml-pr-venda');
    if (el) el.textContent = _fmt(_precoVenda(d.price || 0, _ml.margem));
  };

  window._mlSalvar = _salvar;

})();
